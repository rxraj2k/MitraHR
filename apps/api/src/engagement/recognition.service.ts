import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRecognitionDto } from './dto/create-recognition.dto';
import { RECOGNITION_REACTION_TYPES } from './dto/engagement.constants';

// Shape of req.user for either session kind (see auth/jwt.strategy.ts) —
// same shape used across the app (leave-requests, announcements, etc.).
export interface SessionUser {
  kind: 'STAFF' | 'EMPLOYEE';
  sub: string;
  employeeId?: string | null;
}

function resolveEmployeeId(user: SessionUser): string {
  const id = user.kind === 'EMPLOYEE' ? user.sub : user.employeeId;
  if (!id) throw new ForbiddenException('This action requires an employee record linked to your account');
  return id;
}

const FEED_INCLUDE = {
  fromEmployee: { select: { id: true, fullName: true, employeeCode: true, photoUrl: true } },
  toEmployee: { select: { id: true, fullName: true, employeeCode: true, photoUrl: true } },
  likes: { select: { employeeId: true, reactionType: true } },
  _count: { select: { comments: true } },
};

// Shared shape-up from a raw Prisma row (with FEED_INCLUDE) into the API
// response shape — used by both the single-create response and the feed
// list, so a freshly-created kudos looks identical to one fetched back.
function mapRecognition(r: any, viewerEmployeeId: string | null) {
  const counts: Record<string, number> = {};
  const myReactions: string[] = [];
  for (const like of r.likes as { employeeId: string; reactionType: string }[]) {
    counts[like.reactionType] = (counts[like.reactionType] || 0) + 1;
    if (viewerEmployeeId && like.employeeId === viewerEmployeeId) myReactions.push(like.reactionType);
  }
  return {
    id: r.id,
    fromEmployee: r.fromEmployee,
    toEmployee: r.toEmployee,
    category: r.category,
    message: r.message,
    points: r.points,
    createdAt: r.createdAt,
    reactions: RECOGNITION_REACTION_TYPES.map((type) => ({ type, count: counts[type] || 0 })),
    myReactions,
    commentCount: r._count.comments,
  };
}

@Injectable()
export class RecognitionService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findOne(id: string) {
    const recognition = await this.prisma.recognition.findUnique({ where: { id } });
    if (!recognition) throw new NotFoundException('Recognition not found');
    return recognition;
  }

  async create(user: SessionUser, dto: CreateRecognitionDto) {
    const fromEmployeeId = resolveEmployeeId(user);
    if (fromEmployeeId === dto.toEmployeeId) {
      throw new ForbiddenException('You cannot give yourself a kudos');
    }
    const recognition = await this.prisma.recognition.create({
      data: {
        fromEmployeeId,
        toEmployeeId: dto.toEmployeeId,
        category: dto.category,
        message: dto.message,
        points: dto.points || 0,
      },
      include: FEED_INCLUDE,
    });
    await this.notifications.notifyEmployee(dto.toEmployeeId, {
      type: 'RECOGNITION_RECEIVED',
      title: `${recognition.fromEmployee.fullName} gave you a kudos`,
      body: recognition.message,
      employeeLink: '/engagement',
      staffLink: '/engagement',
    });
    return mapRecognition(recognition, fromEmployeeId);
  }

  async findFeed(viewerEmployeeId: string | null, params: { toEmployeeId?: string; category?: string; limit?: number }) {
    const items = await this.prisma.recognition.findMany({
      where: {
        toEmployeeId: params.toEmployeeId || undefined,
        category: params.category || undefined,
      },
      include: FEED_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
    });
    return items.map((r) => mapRecognition(r, viewerEmployeeId));
  }

  // "Top Recognized" leaderboard for a rolling window — powers a KPI
  // widget on the Engagement page (a simple recency-weighted count plus a
  // running points total, not a full rewards ledger, matching this
  // feature's deliberately simple scope).
  async leaderboard(days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const grouped = await this.prisma.recognition.groupBy({
      by: ['toEmployeeId'],
      where: { createdAt: { gte: since } },
      _count: { toEmployeeId: true },
      _sum: { points: true },
      orderBy: { _count: { toEmployeeId: 'desc' } },
      take: 5,
    });
    if (grouped.length === 0) return [];
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: grouped.map((g) => g.toEmployeeId) } },
      select: { id: true, fullName: true, employeeCode: true, photoUrl: true },
    });
    const byId = new Map(employees.map((e) => [e.id, e]));
    return grouped
      .map((g) => ({ employee: byId.get(g.toEmployeeId), count: g._count.toEmployeeId, points: g._sum.points || 0 }))
      .filter((row) => row.employee);
  }

  async remove(id: string, user: SessionUser) {
    const recognition = await this.findOne(id);
    const isStaff = user.kind === 'STAFF';
    const viewerEmployeeId = user.kind === 'EMPLOYEE' ? user.sub : user.employeeId ?? null;
    if (!isStaff && recognition.fromEmployeeId !== viewerEmployeeId) {
      throw new ForbiddenException('You can only delete kudos you gave');
    }
    await this.prisma.recognition.delete({ where: { id } });
    return { success: true };
  }

  async addReaction(recognitionId: string, employeeId: string, reactionType: string) {
    await this.findOne(recognitionId);
    await this.prisma.recognitionLike.upsert({
      where: { recognitionId_employeeId_reactionType: { recognitionId, employeeId, reactionType } },
      create: { recognitionId, employeeId, reactionType },
      update: {},
    });
    return { success: true };
  }

  async removeReaction(recognitionId: string, employeeId: string, reactionType: string) {
    await this.prisma.recognitionLike.deleteMany({ where: { recognitionId, employeeId, reactionType } });
    return { success: true };
  }

  async listComments(recognitionId: string) {
    await this.findOne(recognitionId);
    return this.prisma.recognitionComment.findMany({
      where: { recognitionId },
      include: { employee: { select: { id: true, fullName: true, photoUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addComment(recognitionId: string, employeeId: string, body: string) {
    await this.findOne(recognitionId);
    return this.prisma.recognitionComment.create({
      data: { recognitionId, employeeId, body },
      include: { employee: { select: { id: true, fullName: true, photoUrl: true } } },
    });
  }

  async deleteComment(commentId: string, user: SessionUser) {
    const comment = await this.prisma.recognitionComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    const isStaff = user.kind === 'STAFF';
    const viewerEmployeeId = user.kind === 'EMPLOYEE' ? user.sub : user.employeeId ?? null;
    if (!isStaff && comment.employeeId !== viewerEmployeeId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    await this.prisma.recognitionComment.delete({ where: { id: commentId } });
    return { success: true };
  }
}
