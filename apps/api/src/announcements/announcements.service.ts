import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

export type AnnouncementAudienceType = 'ALL' | 'DEPARTMENTS' | 'INDIVIDUALS';

// Fixed sticky-note palette (frontend: stickyNoteColors.ts must define the
// same keys) -- randomly assigned per announcement at creation, never
// client-chosen, so the board reads as a mix of colors like a real
// corkboard rather than every note matching the brand color.
export const STICKY_COLORS = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple', 'teal'] as const;
function randomStickyColor(): string {
  return STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  category?: string;
  pinned?: boolean;
  commentsDisabled?: boolean;
  audienceType: AnnouncementAudienceType;
  audienceDepartmentIds?: string[];
  audienceEmployeeIds?: string[];
  expiresAt?: Date;
  attachmentUrl?: string;
  attachmentName?: string;
}

// Shape of req.user for either session kind (see auth/jwt.strategy.ts).
export interface SessionUser {
  kind: 'STAFF' | 'EMPLOYEE';
  sub: string;
  employeeId?: string | null;
}

@Injectable()
export class AnnouncementsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async findOne(id: string) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException('Announcement not found');
    return announcement;
  }

  async create(createdById: string, input: CreateAnnouncementInput) {
    const { audienceDepartmentIds, audienceEmployeeIds, ...rest } = input;
    const announcement = await this.prisma.announcement.create({
      data: {
        ...rest,
        color: randomStickyColor(),
        createdById,
        audienceDepartments:
          input.audienceType === 'DEPARTMENTS' && audienceDepartmentIds?.length
            ? { create: audienceDepartmentIds.map((departmentId) => ({ departmentId })) }
            : undefined,
        recipients:
          input.audienceType === 'INDIVIDUALS' && audienceEmployeeIds?.length
            ? { create: audienceEmployeeIds.map((employeeId) => ({ employeeId })) }
            : undefined,
      },
      include: { createdBy: { select: { name: true } } },
    });
    // Fire-and-forget, same pattern as leave decision emails -- a slow or
    // failing mail send should never hold up or fail the announcement post
    // itself. Recipients mirror exactly who can SEE the announcement
    // in-app (findAllForViewer's audience rules): every active employee for
    // ALL, only the targeted departments' active employees for DEPARTMENTS,
    // only the named employees for INDIVIDUALS -- an announcement aimed at
    // one department or a handful of people never blasts the whole company.
    this.emailAnnouncement(announcement, audienceDepartmentIds, audienceEmployeeIds).catch(() => {});
    return announcement;
  }

  // Strips the rich-text editor's HTML down to a readable plain-text
  // fallback for the `text` part of the email (some mail clients/spam
  // filters penalize HTML-only messages).
  private htmlToText(html: string): string {
    return html
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>(?!$)/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private async emailAnnouncement(
    announcement: {
      id: string;
      title: string;
      body: string;
      category: string | null;
      audienceType: string;
      createdBy: { name: string };
    },
    audienceDepartmentIds?: string[],
    audienceEmployeeIds?: string[],
  ) {
    // emailOnAnnouncement is each employee's own opt-out -- applied as a
    // plain where-clause condition alongside the audience filter, so an
    // employee who muted announcement emails is simply excluded from the
    // recipient list rather than fetched and then filtered in memory.
    const activeOnly = { status: 'ACTIVE', emailOnAnnouncement: true } as const;
    let recipients: { email: string }[];
    if (announcement.audienceType === 'DEPARTMENTS' && audienceDepartmentIds?.length) {
      recipients = await this.prisma.employee.findMany({
        where: { ...activeOnly, departmentId: { in: audienceDepartmentIds } },
        select: { email: true },
      });
    } else if (announcement.audienceType === 'INDIVIDUALS' && audienceEmployeeIds?.length) {
      recipients = await this.prisma.employee.findMany({
        where: { ...activeOnly, id: { in: audienceEmployeeIds } },
        select: { email: true },
      });
    } else {
      recipients = await this.prisma.employee.findMany({
        where: activeOnly,
        select: { email: true },
      });
    }
    if (recipients.length === 0) return;

    const plainBody = this.htmlToText(announcement.body);
    const subject = `New Announcement: ${announcement.title}`;
    const text = `${announcement.title}\n\n${plainBody}\n\n— Posted by ${announcement.createdBy.name} on MitraHR`;
    const html = `
      <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px 16px 0 0; padding: 24px 28px;">
          ${
            announcement.category
              ? `<p style="color: #e0e7ff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 8px;">${announcement.category}</p>`
              : ''
          }
          <h1 style="color: #ffffff; font-size: 20px; line-height: 1.3; margin: 0;">${announcement.title}</h1>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px; padding: 24px 28px;">
          <div style="color: #334155; font-size: 14px; line-height: 1.7;">${announcement.body}</div>
          <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0; padding-top: 16px; border-top: 1px solid #f1f5f9;">
            Posted by ${announcement.createdBy.name} — log in to MitraHR to view, like, or comment.
          </p>
        </div>
      </div>
    `;

    await Promise.all(recipients.map((r) => this.mail.sendMail({ to: r.email, subject, text, html }).catch(() => {})));
  }

  // Audience isn't editable here on purpose — see UpdateAnnouncementDto.
  async update(id: string, dto: UpdateAnnouncementDto) {
    await this.findOne(id);
    return this.prisma.announcement.update({
      where: { id },
      data: {
        ...dto,
        expiresAt: dto.expiresAt === undefined ? undefined : dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.announcement.delete({ where: { id } });
    return { success: true };
  }

  async getFile(id: string) {
    const announcement = await this.findOne(id);
    if (!announcement.attachmentUrl) throw new NotFoundException('This announcement has no attachment');
    return {
      path: join(process.cwd(), announcement.attachmentUrl.replace(/^\//, '')),
      fileName: announcement.attachmentName || 'attachment',
    };
  }

  // Staff (password-login accounts) always see every announcement, expired
  // or not, so they can manage what they've posted — the includeExpired
  // flag only matters to filter their own view down. An OTP-logged-in
  // employee (or a staff account linked to its own Employee record) only
  // ever sees non-expired announcements actually targeted at them.
  async findAllForViewer(user: SessionUser, includeExpired: boolean) {
    const isStaff = user.kind === 'STAFF';
    const now = new Date();

    const announcements = await this.prisma.announcement.findMany({
      where: isStaff && includeExpired ? undefined : { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      include: {
        createdBy: { select: { id: true, name: true } },
        audienceDepartments: { select: { departmentId: true } },
        recipients: { select: { employeeId: true } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });

    const viewerEmployeeId = user.kind === 'EMPLOYEE' ? user.sub : user.employeeId ?? null;
    let viewerDepartmentId: string | null = null;
    if (!isStaff && viewerEmployeeId) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: viewerEmployeeId },
        select: { departmentId: true },
      });
      viewerDepartmentId = employee?.departmentId ?? null;
    }

    const visible = announcements.filter((a) => {
      if (isStaff) return true;
      if (a.audienceType === 'DEPARTMENTS') {
        return !!viewerDepartmentId && a.audienceDepartments.some((d) => d.departmentId === viewerDepartmentId);
      }
      if (a.audienceType === 'INDIVIDUALS') {
        return !!viewerEmployeeId && a.recipients.some((r) => r.employeeId === viewerEmployeeId);
      }
      return true; // ALL
    });

    const likedIds = viewerEmployeeId
      ? new Set(
          (
            await this.prisma.announcementLike.findMany({
              where: { employeeId: viewerEmployeeId, announcementId: { in: visible.map((a) => a.id) } },
              select: { announcementId: true },
            })
          ).map((l) => l.announcementId),
        )
      : new Set<string>();

    return visible.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      attachmentUrl: a.attachmentUrl,
      attachmentName: a.attachmentName,
      category: a.category,
      color: a.color,
      pinned: a.pinned,
      commentsDisabled: a.commentsDisabled,
      audienceType: a.audienceType,
      audienceDepartmentIds: a.audienceDepartments.map((d) => d.departmentId),
      audienceEmployeeCount: a.recipients.length,
      expiresAt: a.expiresAt,
      isExpired: a.expiresAt ? a.expiresAt.getTime() < now.getTime() : false,
      createdByName: a.createdBy.name,
      createdAt: a.createdAt,
      likeCount: a._count.likes,
      commentCount: a._count.comments,
      likedByMe: likedIds.has(a.id),
    }));
  }

  async like(announcementId: string, employeeId: string) {
    await this.findOne(announcementId);
    await this.prisma.announcementLike.upsert({
      where: { announcementId_employeeId: { announcementId, employeeId } },
      create: { announcementId, employeeId },
      update: {},
    });
    return { success: true };
  }

  async unlike(announcementId: string, employeeId: string) {
    await this.prisma.announcementLike.deleteMany({ where: { announcementId, employeeId } });
    return { success: true };
  }

  async listComments(announcementId: string) {
    await this.findOne(announcementId);
    return this.prisma.announcementComment.findMany({
      where: { announcementId },
      include: { employee: { select: { id: true, fullName: true, photoUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addComment(announcementId: string, employeeId: string, body: string) {
    const announcement = await this.findOne(announcementId);
    if (announcement.commentsDisabled) {
      throw new ForbiddenException('Comments are disabled on this announcement');
    }
    return this.prisma.announcementComment.create({
      data: { announcementId, employeeId, body },
      include: { employee: { select: { id: true, fullName: true, photoUrl: true } } },
    });
  }

  async deleteComment(commentId: string, user: SessionUser) {
    const comment = await this.prisma.announcementComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    const isStaff = user.kind === 'STAFF';
    const viewerEmployeeId = user.kind === 'EMPLOYEE' ? user.sub : user.employeeId ?? null;
    if (!isStaff && comment.employeeId !== viewerEmployeeId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    await this.prisma.announcementComment.delete({ where: { id: commentId } });
    return { success: true };
  }
}
