import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const EMPLOYEE_REF_SELECT = { id: true, fullName: true, employeeCode: true, photoUrl: true };

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // Talent Directory (Sprint 19): deploymentStatus is staff-set, but a
  // brand-new hire is created BENCH by default and a completed engagement
  // shouldn't need a staff member to remember to flip it back manually
  // every time. These two hooks keep it roughly in sync with reality on
  // the two events that actually change it — being staffed onto a project,
  // and having your last open one end — without ever touching SHADOW or
  // INTERNAL, which are deliberate staff calls this shouldn't override.
  private async bumpToBillableIfBench(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (employee && (employee.deploymentStatus === 'BENCH' || employee.deploymentStatus === 'ONBOARDING')) {
      await this.prisma.employee.update({ where: { id: employeeId }, data: { deploymentStatus: 'BILLABLE' } });
    }
  }

  private async revertToBenchIfNoOpenAssignments(employeeId: string) {
    const [employee, openCount] = await Promise.all([
      this.prisma.employee.findUnique({ where: { id: employeeId } }),
      this.prisma.projectAssignment.count({ where: { employeeId, endDate: null } }),
    ]);
    if (employee && employee.deploymentStatus === 'BILLABLE' && openCount === 0) {
      await this.prisma.employee.update({ where: { id: employeeId }, data: { deploymentStatus: 'BENCH' } });
    }
  }

  // Leadership (Project.primaryMentorId/secondaryMentorId) and the actual
  // Mentors (Allocation) tag on a ProjectAssignment (mentorRole) are meant
  // to describe the same person, but they're set from two different forms
  // (the project drawer vs. Add Mentors) and can be filled in either order.
  // Whenever a project's leadership FK changes, catch up any already-open
  // assignment for that same employee that hasn't been explicitly tagged
  // yet, so the Mentors (Allocation) row doesn't wrongly read "Not
  // assigned" for someone who plainly is the mentor and is already on the
  // team. Never overwrites a tag someone picked on purpose (PRIMARY vs
  // SECONDARY) via Add Mentors.
  private async syncOpenAssignmentMentorTags(
    projectId: string,
    mentors: { primaryMentorId?: string | null; secondaryMentorId?: string | null },
  ) {
    const jobs: Promise<unknown>[] = [];
    if (mentors.primaryMentorId) {
      jobs.push(
        this.prisma.projectAssignment.updateMany({
          where: { projectId, employeeId: mentors.primaryMentorId, endDate: null, mentorRole: null },
          data: { mentorRole: 'PRIMARY' },
        }),
      );
    }
    if (mentors.secondaryMentorId) {
      jobs.push(
        this.prisma.projectAssignment.updateMany({
          where: { projectId, employeeId: mentors.secondaryMentorId, endDate: null, mentorRole: null },
          data: { mentorRole: 'SECONDARY' },
        }),
      );
    }
    if (jobs.length) await Promise.all(jobs);
  }

  findAll(filters: { clientId?: string; status?: string }) {
    return this.prisma.project.findMany({
      where: { clientId: filters.clientId || undefined, status: filters.status || undefined },
      include: {
        client: { select: { id: true, name: true } },
        technology: true,
        technologies: { select: { id: true, name: true, category: true } },
        primaryMentor: { select: EMPLOYEE_REF_SELECT },
        secondaryMentor: { select: EMPLOYEE_REF_SELECT },
        // Currently-open assignments, straight on the list response — the
        // Project Management list card shows Leadership & Team allocation
        // right on the row now, so it needs the real assignment rows (name,
        // allocation, mentorRole), not just a count.
        assignments: {
          where: { endDate: null },
          select: {
            id: true,
            employeeId: true,
            roleOnProject: true,
            allocationPercent: true,
            mentorRole: true,
            startDate: true,
            employee: { select: EMPLOYEE_REF_SELECT },
          },
        },
        _count: { select: { assignments: { where: { endDate: null } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        technology: true,
        technologies: { select: { id: true, name: true, category: true } },
        primaryMentor: { select: EMPLOYEE_REF_SELECT },
        secondaryMentor: { select: EMPLOYEE_REF_SELECT },
        assignments: {
          include: { employee: { select: EMPLOYEE_REF_SELECT } },
          orderBy: [{ endDate: 'asc' }, { startDate: 'desc' }],
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(input: any) {
    const client = await this.prisma.client.findUnique({ where: { id: input.clientId } });
    if (!client) throw new BadRequestException('Invalid client');
    const { technologyIds, ...rest } = input;
    const project = await this.prisma.project.create({
      data: {
        ...rest,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        targetCompletionDate: input.targetCompletionDate ? new Date(input.targetCompletionDate) : undefined,
        technologyId: input.technologyId || undefined,
        primaryMentorId: input.primaryMentorId || undefined,
        secondaryMentorId: input.secondaryMentorId || undefined,
        technologies: technologyIds?.length ? { connect: technologyIds.map((id: string) => ({ id })) } : undefined,
      },
    });
    await this.syncOpenAssignmentMentorTags(project.id, {
      primaryMentorId: project.primaryMentorId,
      secondaryMentorId: project.secondaryMentorId,
    });
    return project;
  }

  async update(id: string, input: any) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');
    const { technologyIds, ...rest } = input;
    const project = await this.prisma.project.update({
      where: { id },
      data: {
        ...rest,
        startDate: input.startDate ? new Date(input.startDate) : input.startDate === '' ? null : undefined,
        targetCompletionDate: input.targetCompletionDate
          ? new Date(input.targetCompletionDate)
          : input.targetCompletionDate === ''
            ? null
            : undefined,
        technologyId: input.technologyId || null,
        primaryMentorId: input.primaryMentorId || null,
        secondaryMentorId: input.secondaryMentorId || null,
        technologies: technologyIds ? { set: technologyIds.map((id: string) => ({ id })) } : undefined,
      },
    });
    await this.syncOpenAssignmentMentorTags(project.id, {
      primaryMentorId: project.primaryMentorId,
      secondaryMentorId: project.secondaryMentorId,
    });
    return project;
  }

  async remove(id: string) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');
    await this.prisma.project.delete({ where: { id } });
    return { success: true };
  }

  // Ends a project: marks it COMPLETED, stamps the end date (today unless
  // backdated) and the closing summary, and closes out any still-active
  // team assignments as of that same date so "who's on this project" and
  // utilization stay accurate once it's over.
  async end(id: string, input: { endDate?: string; closureSummary: string }) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new BadRequestException('This project has already been ended');
    }
    const endDate = input.endDate ? new Date(input.endDate) : new Date();
    const openAssignments = await this.prisma.projectAssignment.findMany({
      where: { projectId: id, endDate: null },
      select: { employeeId: true },
    });
    const [updated] = await this.prisma.$transaction([
      this.prisma.project.update({
        where: { id },
        data: { status: 'COMPLETED', endDate, closureSummary: input.closureSummary },
      }),
      this.prisma.projectAssignment.updateMany({
        where: { projectId: id, endDate: null },
        data: { endDate },
      }),
    ]);
    await Promise.all(
      openAssignments.map((a) =>
        this.notifications.notifyEmployee(a.employeeId, {
          type: 'PROJECT_ASSIGNMENT_ENDED',
          title: `Your assignment on ${existing.name} has ended`,
          employeeLink: '/',
          staffLink: `/projects/${id}`,
        }),
      ),
    );
    await Promise.all(openAssignments.map((a) => this.revertToBenchIfNoOpenAssignments(a.employeeId)));
    return updated;
  }

  // --- Assignments ---

  async addAssignment(
    projectId: string,
    input: { employeeId: string; roleOnProject?: string; allocationPercent?: number; startDate?: string; mentorRole?: string },
  ) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    const employee = await this.prisma.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee) throw new BadRequestException('Invalid employee');
    // If the Leadership Role dropdown was left blank, don't lose the tag
    // just because of that — if this same person was already picked as
    // this project's Primary/Secondary Leadership (via the project drawer),
    // treat that as the answer instead of leaving mentorRole null.
    let mentorRole = input.mentorRole || null;
    if (!mentorRole) {
      if (input.employeeId === project.primaryMentorId) mentorRole = 'PRIMARY';
      else if (input.employeeId === project.secondaryMentorId) mentorRole = 'SECONDARY';
    }
    const assignment = await this.prisma.projectAssignment.create({
      data: {
        projectId,
        employeeId: input.employeeId,
        roleOnProject: input.roleOnProject,
        allocationPercent: input.allocationPercent ?? 100,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        mentorRole,
      },
      include: { employee: { select: EMPLOYEE_REF_SELECT } },
    });
    // Adding someone as Primary/Secondary mentor here is the one real place
    // that designation is set from now on — it keeps Project.primaryMentorId/
    // secondaryMentorId (used for display elsewhere in the app) in sync with
    // an actual, allocated team assignment instead of a disconnected pick.
    if (mentorRole === 'PRIMARY') {
      await this.prisma.project.update({ where: { id: projectId }, data: { primaryMentorId: input.employeeId } });
    } else if (mentorRole === 'SECONDARY') {
      await this.prisma.project.update({ where: { id: projectId }, data: { secondaryMentorId: input.employeeId } });
    }
    await this.notifications.notifyEmployee(input.employeeId, {
      type: 'PROJECT_ASSIGNED',
      title: `You've been added to ${project.name}`,
      body: input.roleOnProject || undefined,
      employeeLink: '/',
      staffLink: `/projects/${projectId}`,
    });
    await this.bumpToBillableIfBench(input.employeeId);
    return assignment;
  }

  async updateAssignment(
    projectId: string,
    assignmentId: string,
    input: { roleOnProject?: string; allocationPercent?: number; endDate?: string | null },
  ) {
    const assignment = await this.prisma.projectAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.projectId !== projectId) throw new NotFoundException('Assignment not found');
    const updated = await this.prisma.projectAssignment.update({
      where: { id: assignmentId },
      data: {
        roleOnProject: input.roleOnProject,
        allocationPercent: input.allocationPercent,
        endDate: input.endDate === undefined ? undefined : input.endDate === null ? null : new Date(input.endDate),
      },
      include: { employee: { select: EMPLOYEE_REF_SELECT } },
    });
    // Newly closed out (was open, now has a real endDate) — check whether
    // that was this employee's last open assignment.
    if (assignment.endDate === null && input.endDate) {
      await this.revertToBenchIfNoOpenAssignments(assignment.employeeId);
    }
    return updated;
  }

  async removeAssignment(projectId: string, assignmentId: string) {
    const assignment = await this.prisma.projectAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.projectId !== projectId) throw new NotFoundException('Assignment not found');
    await this.prisma.projectAssignment.delete({ where: { id: assignmentId } });
    if (assignment.endDate === null) {
      await this.revertToBenchIfNoOpenAssignments(assignment.employeeId);
    }
    return { success: true };
  }

  // Scoped view for an employee's own "My Projects" — project + client name
  // only, not full client contact details.
  findForEmployee(employeeId: string) {
    return this.prisma.projectAssignment.findMany({
      where: { employeeId },
      include: {
        project: { include: { client: { select: { id: true, name: true } } } },
      },
      orderBy: [{ endDate: 'asc' }, { startDate: 'desc' }],
    });
  }
}
