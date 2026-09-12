import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
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

// The five item categories fold into three sign-off groups for the
// department-approval workflow — IT & Assets, Finance, and HR & Admin —
// matching how a real offboarding is actually reviewed (one IT lead signs
// off assets+access together, one Finance lead signs off settlement, one
// HR lead signs off HR+admin paperwork).
export const APPROVAL_GROUPS = ['IT', 'FINANCE', 'HR_ADMIN'] as const;
export type ApprovalGroup = (typeof APPROVAL_GROUPS)[number];
export const GROUP_CATEGORIES: Record<ApprovalGroup, string[]> = {
  IT: ['IT_ASSETS', 'ACCESS'],
  FINANCE: ['FINANCE'],
  HR_ADMIN: ['HR', 'ADMIN'],
};

const EMPLOYEE_REF_SELECT = {
  id: true,
  fullName: true,
  employeeCode: true,
  photoUrl: true,
  email: true,
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, name: true } },
};

const SUCCESSOR_SELECT = { id: true, fullName: true, employeeCode: true, photoUrl: true };

const EXIT_INCLUDE = {
  employee: { select: EMPLOYEE_REF_SELECT },
  items: { orderBy: { createdAt: 'asc' as const } },
  approvals: { orderBy: { approvedAt: 'asc' as const } },
  handovers: {
    include: {
      project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
      primarySuccessor: { select: SUCCESSOR_SELECT },
      secondarySuccessor: { select: SUCCESSOR_SELECT },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  documents: { orderBy: { uploadedAt: 'desc' as const } },
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
      include: EXIT_INCLUDE,
      orderBy: { initiatedAt: 'desc' },
    });
    return this.withPendingAssetCounts(exits);
  }

  async findOne(id: string) {
    const exit = await this.prisma.employeeExit.findUnique({
      where: { id },
      include: EXIT_INCLUDE,
    });
    if (!exit) throw new NotFoundException('Exit record not found');
    const [withCount] = await this.withPendingAssetCounts([exit]);
    // Active project assignments for the departing employee — used by the
    // Project & Knowledge Handover tab to offer a row per project even
    // before a handover has been logged for it.
    const activeProjects = await this.prisma.projectAssignment.findMany({
      where: { employeeId: exit.employeeId, endDate: null },
      include: { project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } } },
      orderBy: { startDate: 'asc' },
    });
    return { ...withCount, activeProjects };
  }

  async initiate(input: {
    employeeId: string;
    resignationDate: string;
    lastWorkingDay: string;
    reason: string;
    notes?: string;
    accessRevocationAt?: string;
  }) {
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
        resignationDate: new Date(input.resignationDate),
        lastWorkingDay: new Date(input.lastWorkingDay),
        reason: input.reason,
        notes: input.notes || undefined,
        accessRevocationAt: input.accessRevocationAt ? new Date(input.accessRevocationAt) : undefined,
        items: { create: CLEARANCE_ITEMS },
      },
      include: EXIT_INCLUDE,
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

  async update(
    id: string,
    input: {
      resignationDate?: string;
      lastWorkingDay?: string;
      reason?: string;
      notes?: string;
      accessRevocationAt?: string;
    },
  ) {
    await this.findExitOrThrow(id);
    const updated = await this.prisma.employeeExit.update({
      where: { id },
      data: {
        resignationDate: input.resignationDate ? new Date(input.resignationDate) : undefined,
        lastWorkingDay: input.lastWorkingDay ? new Date(input.lastWorkingDay) : undefined,
        reason: input.reason,
        notes: input.notes,
        accessRevocationAt: input.accessRevocationAt ? new Date(input.accessRevocationAt) : undefined,
      },
      include: EXIT_INCLUDE,
    });
    const [withCount] = await this.withPendingAssetCounts([updated]);
    return withCount;
  }

  async updateFeedback(
    id: string,
    input: { interviewCompletedAt?: string; cultureScore?: number; managementFeedback?: string; rehireEligible?: boolean },
  ) {
    await this.findExitOrThrow(id);
    const updated = await this.prisma.employeeExit.update({
      where: { id },
      data: {
        interviewCompletedAt: input.interviewCompletedAt ? new Date(input.interviewCompletedAt) : undefined,
        cultureScore: input.cultureScore,
        managementFeedback: input.managementFeedback,
        rehireEligible: input.rehireEligible,
      },
      include: EXIT_INCLUDE,
    });
    const [withCount] = await this.withPendingAssetCounts([updated]);
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

  // Sign off a department group (IT / FINANCE / HR_ADMIN). Requires every
  // checklist item in that group's categories to already be checked off —
  // approval is the section owner's final review, not a substitute for
  // doing the work. Re-approving (e.g. after correcting something)
  // overwrites the previous sign-off rather than stacking duplicates,
  // since the group is @@unique per exit.
  async approveCategory(exitId: string, group: string, approvedBy: string, notes?: string) {
    if (!APPROVAL_GROUPS.includes(group as ApprovalGroup)) {
      throw new BadRequestException('Unknown approval group');
    }
    const exit = await this.findExitOrThrow(exitId);
    const categories = GROUP_CATEGORIES[group as ApprovalGroup];
    const incomplete = exit.items.filter((i) => categories.includes(i.category) && !i.completed);
    if (incomplete.length > 0) {
      throw new BadRequestException(
        `${incomplete.length} checklist item${incomplete.length === 1 ? '' : 's'} in this section still need${incomplete.length === 1 ? 's' : ''} to be completed before it can be approved`,
      );
    }
    await this.prisma.exitCategoryApproval.upsert({
      where: { exitId_group: { exitId, group } },
      update: { approvedBy, approvedAt: new Date(), notes },
      create: { exitId, group, approvedBy, notes },
    });
    return this.findOne(exitId);
  }

  async revokeCategoryApproval(exitId: string, group: string) {
    const approval = await this.prisma.exitCategoryApproval.findUnique({ where: { exitId_group: { exitId, group } } });
    if (!approval) throw new NotFoundException('This section has not been approved yet');
    await this.prisma.exitCategoryApproval.delete({ where: { id: approval.id } });
    return this.findOne(exitId);
  }

  async upsertHandover(
    exitId: string,
    input: { projectId: string; primarySuccessorId?: string; secondarySuccessorId?: string; notes?: string; confirmed?: boolean },
  ) {
    await this.findExitOrThrow(exitId);
    const project = await this.prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw new BadRequestException('Invalid project');
    await this.prisma.exitHandover.upsert({
      where: { exitId_projectId: { exitId, projectId: input.projectId } },
      update: {
        primarySuccessorId: input.primarySuccessorId || null,
        secondarySuccessorId: input.secondarySuccessorId || null,
        notes: input.notes,
        confirmed: input.confirmed,
      },
      create: {
        exitId,
        projectId: input.projectId,
        primarySuccessorId: input.primarySuccessorId || undefined,
        secondarySuccessorId: input.secondarySuccessorId || undefined,
        notes: input.notes || undefined,
        confirmed: input.confirmed || false,
      },
    });
    return this.findOne(exitId);
  }

  async removeHandover(exitId: string, handoverId: string) {
    const handover = await this.prisma.exitHandover.findUnique({ where: { id: handoverId } });
    if (!handover || handover.exitId !== exitId) throw new NotFoundException('Handover not found');
    await this.prisma.exitHandover.delete({ where: { id: handoverId } });
    return this.findOne(exitId);
  }

  async addDocument(exitId: string, input: { docType: string; fileName: string; fileUrl: string }) {
    await this.findExitOrThrow(exitId);
    await this.prisma.exitDocument.create({ data: { exitId, ...input } });
    return this.findOne(exitId);
  }

  async getDocumentFile(exitId: string, docId: string) {
    const doc = await this.prisma.exitDocument.findUnique({ where: { id: docId } });
    if (!doc || doc.exitId !== exitId) throw new NotFoundException('Document not found');
    return { path: join(process.cwd(), doc.fileUrl.replace(/^\//, '')), fileName: doc.fileName };
  }

  async removeDocument(exitId: string, docId: string) {
    const doc = await this.prisma.exitDocument.findUnique({ where: { id: docId } });
    if (!doc || doc.exitId !== exitId) throw new NotFoundException('Document not found');
    await this.prisma.exitDocument.delete({ where: { id: docId } });
    return this.findOne(exitId);
  }

  private async findExitOrThrow(id: string) {
    const exit = await this.prisma.employeeExit.findUnique({ where: { id }, include: EXIT_INCLUDE });
    if (!exit) throw new NotFoundException('Exit record not found');
    return exit;
  }

  // Marks the whole exit complete: requires every checklist item AND every
  // department group signed off first, flips the employee to INACTIVE, and
  // closes out any still-open project assignments as of the last working
  // day — the same tidy-up ProjectsService.end does when a project closes,
  // so Bench & Utilization and the org directory stay accurate without a
  // manual follow-up step.
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
    const approvedGroups = new Set(exit.approvals.map((a) => a.group));
    const missingGroups = APPROVAL_GROUPS.filter((g) => !approvedGroups.has(g));
    if (missingGroups.length > 0) {
      throw new BadRequestException(
        `Still awaiting sign-off from: ${missingGroups.map((g) => (g === 'HR_ADMIN' ? 'HR & Admin' : g === 'IT' ? 'IT & Assets' : 'Finance')).join(', ')}`,
      );
    }
    const [, updatedExit] = await this.prisma.$transaction([
      this.prisma.employee.update({ where: { id: exit.employeeId }, data: { status: 'INACTIVE' } }),
      this.prisma.employeeExit.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
        include: EXIT_INCLUDE,
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
    const exit = await this.findExitOrThrow(id);
    if (exit.status === 'COMPLETED') {
      throw new BadRequestException('Cannot delete a completed exit record');
    }
    await this.prisma.employeeExit.delete({ where: { id } });
    return { success: true };
  }
}
