import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OFFICE_WALL_REACTION_TYPES } from './dto/office-wall.constants';
import { CreatePostDto } from './dto/create-post.dto';

// Shape of req.user for either session kind (see auth/jwt.strategy.ts) --
// same shape used across the app (recognition, announcements, leave...).
// `sid` is the session id embedded in the JWT (see AuthService.startSession)
// -- used here only to exclude the poster's own session from the "new
// post" broadcast below, not for anything auth-related.
export interface SessionUser {
  kind: 'STAFF' | 'EMPLOYEE';
  sub: string;
  employeeId?: string | null;
  sid?: string;
}

export function resolveEmployeeId(user: SessionUser): string | null {
  return user.kind === 'EMPLOYEE' ? user.sub : user.employeeId ?? null;
}

function requireEmployeeId(user: SessionUser): string {
  const id = resolveEmployeeId(user);
  if (!id) throw new ForbiddenException('This action requires an employee record linked to your account');
  return id;
}

const AUTHOR_SELECT = {
  id: true,
  fullName: true,
  employeeCode: true,
  photoUrl: true,
  department: { select: { name: true } },
  designation: { select: { name: true } },
};

const FEED_INCLUDE = {
  author: { select: AUTHOR_SELECT },
  taggedEmployee: { select: AUTHOR_SELECT },
  media: { orderBy: { sortOrder: 'asc' as const } },
  mentions: { include: { employee: { select: { id: true, fullName: true } } } },
  likes: { select: { employeeId: true, reactionType: true } },
  _count: { select: { comments: true } },
};

// Truncates a post body to a short, readable snippet for notification text
// -- never the full body, which can be long and would make every "new
// post" / "shared with you" notification unreadably wide.
function snippet(body: string, max = 90): string {
  const clean = body.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function mapPost(row: any, viewerEmployeeId: string | null, onlineEmployeeIds: Set<string>) {
  const counts: Record<string, number> = {};
  const myReactions: string[] = [];
  for (const like of row.likes as { employeeId: string; reactionType: string }[]) {
    counts[like.reactionType] = (counts[like.reactionType] || 0) + 1;
    if (viewerEmployeeId && like.employeeId === viewerEmployeeId) myReactions.push(like.reactionType);
  }
  return {
    id: row.id,
    author: { ...row.author, online: onlineEmployeeIds.has(row.author.id) },
    body: row.body,
    category: row.category,
    taggedEmployee: row.taggedEmployee,
    media: row.media.map((m: any) => ({ id: m.id, url: m.url, fileName: m.fileName })),
    mentions: row.mentions.map((m: any) => m.employee),
    createdAt: row.createdAt,
    reactions: OFFICE_WALL_REACTION_TYPES.map((type) => ({ type, count: counts[type] || 0 })),
    myReactions,
    commentCount: row._count.comments,
    canDelete: viewerEmployeeId === row.authorId,
  };
}

@Injectable()
export class OfficeWallService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findOne(id: string) {
    const post = await this.prisma.officeWallPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  // Every employee/staff session currently counted "online" -- same idle
  // cutoff Admin Center's Live User Activity uses (AdminSettings' Session
  // Idle Timeout), read from the same UserSession table, but exposed here
  // as a small, privacy-safe presence list (name/photo/department only --
  // no IP, device, or session-management actions, which stay Admin-only).
  private async getOnlineSessions() {
    const settings = await this.prisma.adminSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
    const idleMs = (settings?.sessionIdleTimeoutMin ?? 30) * 60 * 1000;
    const cutoff = new Date(Date.now() - idleMs);
    return this.prisma.userSession.findMany({
      where: { revoked: false, loggedOutAt: null, lastSeenAt: { gte: cutoff } },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  // Resolves the current online sessions down to distinct people (an
  // employee can be online more than once), each optionally carrying a
  // department/designation when they have a linked Employee record.
  async getOnlinePresence() {
    const sessions = await this.getOnlineSessions();
    const employeeIds = new Set<string>();
    const staffIds = new Set<string>();
    for (const s of sessions) {
      if (s.userKind === 'EMPLOYEE') employeeIds.add(s.userId);
      else staffIds.add(s.userId);
    }

    const [employees, staff] = await Promise.all([
      employeeIds.size
        ? this.prisma.employee.findMany({ where: { id: { in: [...employeeIds] } }, select: AUTHOR_SELECT })
        : [],
      staffIds.size
        ? this.prisma.user.findMany({
            where: { id: { in: [...staffIds] } },
            select: { id: true, name: true, role: true, linkedEmployee: { select: AUTHOR_SELECT } },
          })
        : [],
    ]);

    const byKey = new Map<string, { id: string; fullName: string; photoUrl: string | null; department: string | null; designation: string | null }>();
    for (const e of employees) {
      byKey.set(`emp:${e.id}`, {
        id: e.id,
        fullName: e.fullName,
        photoUrl: e.photoUrl,
        department: e.department?.name ?? null,
        designation: e.designation?.name ?? null,
      });
    }
    for (const u of staff) {
      // A staff account linked to its own Employee record is the same
      // person as that employee -- dedupe onto the employee entry rather
      // than listing them twice.
      const key = u.linkedEmployee ? `emp:${u.linkedEmployee.id}` : `staff:${u.id}`;
      if (byKey.has(key)) continue;
      byKey.set(key, {
        id: u.linkedEmployee?.id || u.id,
        fullName: u.linkedEmployee?.fullName || u.name,
        photoUrl: u.linkedEmployee?.photoUrl ?? null,
        department: u.linkedEmployee?.department?.name ?? null,
        designation: u.linkedEmployee?.designation?.name ?? (u.role ? u.role.replace(/_/g, ' ') : null),
      });
    }
    return [...byKey.values()];
  }

  async findFeed(viewerEmployeeId: string | null, params: { category?: string; hashtag?: string; limit?: number }) {
    const posts = await this.prisma.officeWallPost.findMany({
      where: {
        category: params.category || undefined,
        body: params.hashtag ? { contains: `#${params.hashtag}` } : undefined,
      },
      include: FEED_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
    });
    const online = await this.getOnlinePresence();
    const onlineIds = new Set(online.map((o) => o.id));
    return posts.map((p) => mapPost(p, viewerEmployeeId, onlineIds));
  }

  async create(user: SessionUser, dto: CreatePostDto) {
    const authorId = requireEmployeeId(user);
    const mentionIds = [...new Set((dto.mentionedEmployeeIds || []).filter((id) => id !== authorId))];

    const post = await this.prisma.officeWallPost.create({
      data: {
        authorId,
        body: dto.body,
        category: dto.category,
        taggedEmployeeId: dto.taggedEmployeeId && dto.taggedEmployeeId !== authorId ? dto.taggedEmployeeId : undefined,
        mentions: mentionIds.length ? { create: mentionIds.map((employeeId) => ({ employeeId })) } : undefined,
      },
      include: FEED_INCLUDE,
    });

    // Tags & mentions: notify the tagged colleague and everyone @mentioned
    // in the body (deduped, never the author).
    const notifyIds = new Set(mentionIds);
    if (dto.taggedEmployeeId && dto.taggedEmployeeId !== authorId) notifyIds.add(dto.taggedEmployeeId);
    if (notifyIds.size) {
      const authorName = post.author.fullName;
      for (const employeeId of notifyIds) {
        this.notifications
          .notifyEmployee(employeeId, {
            type: 'OFFICE_WALL_MENTION',
            title: `${authorName} tagged you on Office Wall`,
            body: snippet(dto.body),
            employeeLink: '/office-wall',
            staffLink: '/office-wall',
          })
          .catch(() => {});
      }
    }

    // New post: a toast to whoever is currently online, same as the spec
    // asks -- reusing the presence session list rather than notifying the
    // whole company every time someone posts. The poster's own session
    // (by sid) is excluded so they don't get a toast about their own post.
    this.getOnlineSessions()
      .then((sessions) => {
        const authorName = post.author.fullName;
        for (const s of sessions) {
          if (user.sid && s.sessionId === user.sid) continue;
          this.notifications
            .notifySelf(s.userKind as 'STAFF' | 'EMPLOYEE', s.userId, {
              type: 'OFFICE_WALL_POST',
              title: `${authorName} posted on Office Wall`,
              body: snippet(dto.body),
              link: '/office-wall',
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    const online = await this.getOnlinePresence();
    return mapPost(post, authorId, new Set(online.map((o) => o.id)));
  }

  async addMedia(postId: string, user: SessionUser, url: string, fileName: string) {
    const post = await this.findOne(postId);
    const employeeId = requireEmployeeId(user);
    if (post.authorId !== employeeId) throw new ForbiddenException('You can only add photos to your own post');
    const count = await this.prisma.officeWallMedia.count({ where: { postId } });
    await this.prisma.officeWallMedia.create({ data: { postId, url, fileName, sortOrder: count } });
    return this.prisma.officeWallMedia.findMany({ where: { postId }, orderBy: { sortOrder: 'asc' } });
  }

  async remove(id: string, user: SessionUser) {
    const post = await this.findOne(id);
    const isStaff = user.kind === 'STAFF';
    const viewerEmployeeId = resolveEmployeeId(user);
    if (!isStaff && post.authorId !== viewerEmployeeId) {
      throw new ForbiddenException('You can only delete your own post');
    }
    await this.prisma.officeWallPost.delete({ where: { id } });
    return { success: true };
  }

  async addReaction(postId: string, employeeId: string, reactionType: string) {
    const post = await this.findOne(postId);
    const existing = await this.prisma.officeWallLike.findUnique({
      where: { postId_employeeId_reactionType: { postId, employeeId, reactionType } },
    });
    if (!existing) {
      await this.prisma.officeWallLike.create({ data: { postId, employeeId, reactionType } });
      if (post.authorId !== employeeId) {
        const reactor = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { fullName: true } });
        this.notifications
          .notifyEmployee(post.authorId, {
            type: 'OFFICE_WALL_LIKE',
            title: `${reactor?.fullName || 'Someone'} reacted to your post`,
            body: 'on Office Wall',
            employeeLink: '/office-wall',
            staffLink: '/office-wall',
          })
          .catch(() => {});
      }
    }
    return { success: true };
  }

  async removeReaction(postId: string, employeeId: string, reactionType: string) {
    await this.prisma.officeWallLike.deleteMany({ where: { postId, employeeId, reactionType } });
    return { success: true };
  }

  async listComments(postId: string) {
    await this.findOne(postId);
    return this.prisma.officeWallComment.findMany({
      where: { postId },
      include: { employee: { select: { id: true, fullName: true, photoUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addComment(postId: string, employeeId: string, body: string) {
    const post = await this.findOne(postId);
    const comment = await this.prisma.officeWallComment.create({
      data: { postId, employeeId, body },
      include: { employee: { select: { id: true, fullName: true, photoUrl: true } } },
    });
    if (post.authorId !== employeeId) {
      this.notifications
        .notifyEmployee(post.authorId, {
          type: 'OFFICE_WALL_COMMENT',
          title: `${comment.employee.fullName} commented on your post`,
          body: snippet(body),
          employeeLink: '/office-wall',
          staffLink: '/office-wall',
        })
        .catch(() => {});
    }
    return comment;
  }

  async deleteComment(commentId: string, user: SessionUser) {
    const comment = await this.prisma.officeWallComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    const isStaff = user.kind === 'STAFF';
    const viewerEmployeeId = resolveEmployeeId(user);
    if (!isStaff && comment.employeeId !== viewerEmployeeId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    await this.prisma.officeWallComment.delete({ where: { id: commentId } });
    return { success: true };
  }

  // "Share" -- sends the recipient a real, working link back to this post
  // (the Office Wall page reads ?post=<id> and scrolls to/highlights it)
  // via a genuine notification + toast, rather than a fake "link copied"
  // gesture with nothing behind it.
  async sharePost(postId: string, fromEmployeeId: string, toEmployeeId: string) {
    const post = await this.findOne(postId);
    if (toEmployeeId === fromEmployeeId) throw new ForbiddenException('You cannot share a post with yourself');
    const [sharer] = await Promise.all([
      this.prisma.employee.findUnique({ where: { id: fromEmployeeId }, select: { fullName: true } }),
    ]);
    await this.notifications.notifyEmployee(toEmployeeId, {
      type: 'OFFICE_WALL_SHARE',
      title: `${sharer?.fullName || 'A colleague'} shared a post with you`,
      body: snippet(post.body),
      employeeLink: `/office-wall?post=${postId}`,
      staffLink: `/office-wall?post=${postId}`,
    });
    return { success: true };
  }
}
