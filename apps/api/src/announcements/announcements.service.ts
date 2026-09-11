import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

export type AnnouncementAudienceType = 'ALL' | 'DEPARTMENTS' | 'INDIVIDUALS';

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
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException('Announcement not found');
    return announcement;
  }

  create(createdById: string, input: CreateAnnouncementInput) {
    const { audienceDepartmentIds, audienceEmployeeIds, ...rest } = input;
    return this.prisma.announcement.create({
      data: {
        ...rest,
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
    });
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
