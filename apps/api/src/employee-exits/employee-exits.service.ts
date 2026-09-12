import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// Fixed offboarding checklist, seeded onto every new exit the moment it's
// initiated — same pattern as EmployeeTraining being seeded from the
// Training Catalog. Not configurable yet (no "Exit Checklist" master-data
// list exists); revisit if a real need for a different checklist per
// role/department ever comes up.
export const CLEARANCE_ITEMS: { category: string; label: string }[] = [
  { category: 'IT_ASSETS', label: 'All company assets returned (laptop, monitor, ID card, etc.)' },
  { category: 'ACCESS', label: 'System and account access revoked (email, VPN, SaaS tools, IAM access)' },
  { category: 'FINANCE', label: 'Full and final settlement processed' },
  { category: 'HR', label: 'Exit interview conducted' },
  { category: 'HR', label: 'Experience / relieving letter issued' },
  { category: 'ADMIN', label: 'Confidentiality/NDA acknowledgment and document handover collected' },
];

const EMPLOYEE_REF_SELECT = {
  id: true,
  fullName: true,
  employeeCode: true,
  photoUrl: true,
  email: true,
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, name: true } },
};

@Injectable()
export class EmployeeExitsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // Attaches a live count of each exit's employee's still-unreturned
  // assets — a read-time hint next to the IT_ASSETS checklist item, not a
  // stored field, so it's always accurate even if assets are
  // returned/reassigned after the exit was initiated.
  private async withPendingAssetCounts<T extends { employeeId: string }>(exits: T[]) {
    return Promise.all(
      exits.map(async (exit) => ({
        ...exit,
        pendingAssetCount: await this.prisma.assetAssignment.count({
          where: { employeeId: exit.employeeId, returnedAt: null },
        }),
      })),
    );
  }

  async findAll(status?: string) {
    const exits = await this.prisma.employeeExit.findMany({
      where: { status: status || undefined },
      include: { employee: { select: EMPLOYEE_REF_SELECT }, items: { orderBy: { createdAt: 'asc' } } },
      orderBy: { initiatedAt: 'desc' },
    });
    return this.withPendingAssetCounts(exits);
  }

  async findOne(id: string) {
    const exit = await this.prisma.employeeExit.findUnique({
      where: { id },
      include: { employee: { select: EMPLOYEE_REF_SELECT }, items: { orderBy: { createdAt: 'asc' } } },
    });
    if (!exit) throw new NotFoundException('Exit record not found');
    const [withCount] = await this.withPendingAssetCounts([exit]);
    return withCount;
  }

  async initiate(input: { employeeId: string; lastWorkingDay: string; reason: string; notes?: string }) {
    const employee = await this.prisma.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee) throw new BadRequestException('Invalid employee');
    if (employee.status !== 'ACTIVE') {
      throw new BadRequestException('This employee is not currently active');
    }
    const existing = await this.prisma.employeeExit.findUnique({ where: { employeeId: input.employeeId } });
    if (existing) {
      throw new BadRequestException('An exit has already been initiated for this employee');
    }
    const exit = await this.prisma.employeeExit.create({
      data: {
        employeeId: input.employeeId,
        lastWorkingDay: new Date(input.lastWorkingDay),
        reason: input.reason,
        notes: input.notes || undefined,
        items: { create: CLEARANCE_ITEMS },
      },
      include: { employee: { select: EMPLOYEE_REF_SELECT }, items: { orderBy: { createdAt: 'asc' } } },
    });
    await this.notifications.notifyAllStaff({
      type: 'EXIT_INITIATED',
      title: `Exit initiated: ${employee.fullName}`,
      body: `Last working day ${new Date(input.lastWorkingDay).toLocaleDateString()}`,
      link: '/exits',
    });
    const [withCount] = await this.withPendingAssetCounts([exit]);
    return withCount;
  }

  async updateItem(exitId: string, itemId: string, input: { completed?: boolean; notes?: string }) {
    const item = await this.prisma.exitClearanceItem.findUnique({ where: { id: itemId } });
    if (!item || item.exitId !== exitId) throw new NotFoundException('Checklist item not found');
    return this.prisma.exitClearanceItem.update({
      where: { id: itemId },
      data: {
        completed: input.completed,
        completedAt: input.completed === undefined ? undefined : input.completed ? new Date() : null,
        notes: input.notes,
      },
    });
  }

  // Marks the whole exit complete: requires every checklist item checked
  // off first, flips the employee to INACTIVE, and closes out any still-
  // open project assignments as of the last working day — the same
  // tidy-up ProjectsService.end does when a project closes, so Bench &
  // Utilization and the org directory stay accurate without a manual
  // follow-up step.
  async markCleared(id: string) {
    const exit = await this.findOne(id);
    if (exit.status === 'COMPLETED') {
      throw new BadRequestException('This exit is already marked complete');
    }
    const incomplete = exit.items.filter((i) => !i.completed);
    if (incomplete.length > 0) {
      throw new BadRequestException(
        `${incomplete.length} checklist item${incomplete.length === 1 ? '' : 's'} still need${incomplete.length === 1 ? 's' : ''} to be completed`,
      );
    }
    const [, updatedExit] = await this.prisma.$transaction([
      this.prisma.employee.update({ where: { id: exit.employeeId }, data: { status: 'INACTIVE' } }),
      this.prisma.employeeExit.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
        include: { employee: { select: EMPLOYEE_REF_SELECT }, items: { orderBy: { createdAt: 'asc' } } },
      }),
      this.prisma.projectAssignment.updateMany({
        where: { employeeId: exit.employeeId, endDate: null },
        data: { endDate: exit.lastWorkingDay },
      }),
    ]);
    await this.notifications.notifyAllStaff({
      type: 'EXIT_COMPLETED',
      title: `Clearance complete: ${exit.employee.fullName}`,
      link: '/exits',
    });
    const [withCount] = await this.withPendingAssetCounts([updatedExit]);
    return withCount;
  }

  async remove(id: string) {
    const exit = await this.findOne(id);
    if (exit.status === 'COMPLETED') {
      throw new BadRequestException('Cannot delete a completed exit record');
    }
    await this.prisma.employeeExit.delete({ where: { id } });
    return { success: true };
  }
}
