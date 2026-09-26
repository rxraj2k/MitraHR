import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationInput {
  type: string;
  title: string;
  body?: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  private create(recipientKind: string, recipientId: string, input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: { recipientKind, recipientId, type: input.type, title: input.title, body: input.body, link: input.link },
    });
  }

  // The one entry point every feature module calls: "notify the employee
  // at this id." Resolves to whichever session will actually read it — a
  // pure OTP employee reads it as EMPLOYEE, but an admin linked to their
  // own Employee record (Raj/Sanjay/Megha can each submit their own leave,
  // hold their own assets, etc.) only ever logs in as STAFF, so the
  // notification has to land there instead or they'd never see it.
  // employeeLink/staffLink exist because the two sessions use different
  // routes for the same feature (e.g. /my-leave vs /leave).
  async notifyEmployee(
    employeeId: string,
    input: CreateNotificationInput & { employeeLink?: string; staffLink?: string },
  ) {
    const linkedUser = await this.prisma.user.findUnique({ where: { employeeId } });
    if (linkedUser) {
      return this.create('STAFF', linkedUser.id, { ...input, link: input.staffLink });
    }
    return this.create('EMPLOYEE', employeeId, { ...input, link: input.employeeLink });
  }

  // Notifies a session kind+id directly, bypassing the
  // employee-record-resolution notifyEmployee does -- for events tied to
  // the SESSION itself rather than an employee (right now: AuthService's
  // new-sign-in alert, which needs to reach whichever exact account (a
  // pure STAFF login with no linked Employee, or an EMPLOYEE) just signed
  // in, not "whichever session that employee would read this as").
  notifySelf(kind: 'STAFF' | 'EMPLOYEE', id: string, input: CreateNotificationInput) {
    return this.create(kind, id, input);
  }

  async notifyAllStaff(input: CreateNotificationInput) {
    const staff = await this.prisma.user.findMany({ select: { id: true } });
    if (staff.length === 0) return;
    await this.prisma.notification.createMany({
      data: staff.map((s) => ({
        recipientKind: 'STAFF',
        recipientId: s.id,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
      })),
    });
  }

  findForUser(kind: string, id: string) {
    return this.prisma.notification.findMany({
      where: { recipientKind: kind, recipientId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  unreadCount(kind: string, id: string) {
    return this.prisma.notification.count({ where: { recipientKind: kind, recipientId: id, readAt: null } });
  }

  async markRead(id: string, requester: { kind: string; sub: string }) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.recipientKind !== requester.kind || notification.recipientId !== requester.sub) {
      throw new ForbiddenException('Not your notification');
    }
    if (notification.readAt) return notification;
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  markAllRead(kind: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { recipientKind: kind, recipientId: id, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
