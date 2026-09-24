import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { statusFor, UtilizationStatus } from '../utilization/utilization.service';

const EMPLOYEE_CARD_SELECT = {
  id: true,
  fullName: true,
  employeeCode: true,
  photoUrl: true,
  department: { select: { name: true } },
  designation: { select: { name: true } },
  skills: { select: { skill: { select: { name: true } } } },
  projectAssignments: {
    where: { endDate: null, project: { status: { in: ['ACTIVE', 'ON_HOLD'] } } },
    select: {
      id: true,
      allocationPercent: true,
      project: { select: { id: true, name: true } },
    },
  },
  trainingAssignments: { select: { status: true } },
};

export interface SandboxPlanChange {
  type: 'ASSIGN' | 'END';
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  assignmentId?: string;
}

// Purely a "what-if" planning surface: it reads real employees/projects but
// writes only to SandboxPlacement, never to ProjectAssignment — dragging a
// card around here can never create a real assignment or fire a
// notification. Each employee's card also carries their REAL current
// utilization (status + %) as context, computed the same way Bench &
// Utilization does (see utilization.service.statusFor) — that's just a
// read-only label, it does NOT drive where a card starts out on the board.
// Whoever's happy with a shuffle can now either make it official manually
// on the Project detail page, or hit "Apply & Save Plan" here, which
// re-derives the same diff (see getPlan) and commits it through
// ProjectsService — the exact same code path (and notifications, mentor
// sync, bench/billable bump) as adding or ending an assignment by hand.
@Injectable()
export class StaffingSandboxService {
  constructor(
    private prisma: PrismaService,
    private projectsService: ProjectsService,
  ) {}

  async getBoard() {
    const [employees, projects, placements] = await Promise.all([
      this.prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: EMPLOYEE_CARD_SELECT,
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.project.findMany({
        where: { status: { in: ['ACTIVE', 'ON_HOLD'] } },
        select: { id: true, name: true, status: true, category: true, client: { select: { name: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.sandboxPlacement.findMany(),
    ]);

    const projectIds = new Set(projects.map((p) => p.id));
    const placementByEmployee = new Map<string, string | null>(
      placements.map((p) => [p.employeeId, p.projectId]),
    );

    const columns: Record<string, any[]> = { bench: [] };
    for (const p of projects) columns[p.id] = [];

    for (const emp of employees) {
      const totalAllocation = emp.projectAssignments.reduce((sum, a) => sum + a.allocationPercent, 0);
      const trainingTotal = emp.trainingAssignments.length;
      const trainingCompleted = emp.trainingAssignments.filter((a) => a.status === 'COMPLETED').length;
      const hasIncompleteTraining = trainingTotal > trainingCompleted;

      const card = {
        id: emp.id,
        fullName: emp.fullName,
        employeeCode: emp.employeeCode,
        photoUrl: emp.photoUrl,
        departmentName: emp.department?.name || null,
        designationName: emp.designation?.name || null,
        skills: emp.skills.slice(0, 4).map((s) => s.skill.name),
        realStatus: statusFor(totalAllocation, hasIncompleteTraining),
        realAllocationPercent: totalAllocation,
      };
      const placedProjectId = placementByEmployee.get(emp.id);
      if (placedProjectId && projectIds.has(placedProjectId)) {
        columns[placedProjectId].push(card);
      } else {
        columns.bench.push(card);
      }
    }

    return {
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        clientName: p.client.name,
        category: p.category,
      })),
      columns,
    };
  }

  // projectId null moves the employee back to the Bench column.
  async place(employeeId: string, projectId: string | null) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    if (projectId === null) {
      await this.prisma.sandboxPlacement.deleteMany({ where: { employeeId } });
      return { employeeId, projectId: null };
    }

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.sandboxPlacement.upsert({
      where: { employeeId },
      create: { employeeId, projectId },
      update: { projectId },
    });
  }

  // "Clear the board" — everyone back to Bench, for starting a fresh plan.
  async reset() {
    await this.prisma.sandboxPlacement.deleteMany({});
    return { success: true };
  }

  // Diffs every touched SandboxPlacement row (i.e. every card someone
  // actually dragged this session — untouched employees never get a row,
  // so they're correctly left out of the plan) against that employee's
  // REAL open assignments. A move onto a project becomes an ASSIGN (plus
  // an END for whatever real project(s) they're leaving); a move back to
  // Bench becomes an END for every real open assignment. Already-matching
  // placements produce no line item.
  async getPlan(): Promise<SandboxPlanChange[]> {
    const placements = await this.prisma.sandboxPlacement.findMany({
      include: { employee: { select: { id: true, fullName: true } } },
    });
    if (placements.length === 0) return [];

    const employeeIds = placements.map((p) => p.employeeId);
    const [realAssignments, projects] = await Promise.all([
      this.prisma.projectAssignment.findMany({
        where: { employeeId: { in: employeeIds }, endDate: null, project: { status: { in: ['ACTIVE', 'ON_HOLD'] } } },
        select: { id: true, employeeId: true, projectId: true, project: { select: { name: true } } },
      }),
      this.prisma.project.findMany({ where: { status: { in: ['ACTIVE', 'ON_HOLD'] } }, select: { id: true, name: true } }),
    ]);
    const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

    const changes: SandboxPlanChange[] = [];
    for (const placement of placements) {
      const currentReal = realAssignments.filter((a) => a.employeeId === placement.employeeId);
      const targetProjectId = placement.projectId && projectNameById.has(placement.projectId) ? placement.projectId : null;

      if (targetProjectId && !currentReal.some((a) => a.projectId === targetProjectId)) {
        changes.push({
          type: 'ASSIGN',
          employeeId: placement.employeeId,
          employeeName: placement.employee.fullName,
          projectId: targetProjectId,
          projectName: projectNameById.get(targetProjectId) || 'Unknown project',
        });
      }
      for (const a of currentReal) {
        if (a.projectId !== targetProjectId) {
          changes.push({
            type: 'END',
            employeeId: placement.employeeId,
            employeeName: placement.employee.fullName,
            projectId: a.projectId,
            projectName: a.project.name,
            assignmentId: a.id,
          });
        }
      }
    }
    return changes;
  }

  // Re-derives the plan fresh (never trusts a client-supplied list) and
  // commits every line item through ProjectsService — same notifications,
  // mentor sync and bench/billable bump as doing it by hand on the Project
  // detail page. Endings run first so nobody briefly reads as over-100%.
  // Clears the board afterwards: the sandbox is now just reality again.
  async applyPlan() {
    const changes = await this.getPlan();
    const ends = changes.filter((c) => c.type === 'END');
    const assigns = changes.filter((c) => c.type === 'ASSIGN');

    for (const c of ends) {
      if (!c.assignmentId) continue;
      await this.projectsService.updateAssignment(c.projectId, c.assignmentId, {
        endDate: new Date().toISOString(),
      });
    }
    for (const c of assigns) {
      await this.projectsService.addAssignment(c.projectId, {
        employeeId: c.employeeId,
        allocationPercent: 100,
      });
    }

    await this.prisma.sandboxPlacement.deleteMany({});
    return { success: true, changesApplied: changes.length };
  }
}
