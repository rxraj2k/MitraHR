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

  findAll(filters: { clientId?: string; status?: string }) {
    return this.prisma.project.findMany({
      where: { clientId: filters.clientId || undefined, status: filters.status || undefined },
      include: {
        client: { select: { id: true, name: true } },
        technology: true,
        primaryMentor: { select: EMPLOYEE_REF_SELECT },
        secondaryMentor: { select: EMPLOYEE_REF_SELECT },
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
    return this.prisma.project.create({
      data: {
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        technologyId: input.technologyId || undefined,
        primaryMentorId: input.primaryMentorId || undefined,
        secondaryMentorId: input.secondaryMentorId || undefined,
      },
    });
  }

  async update(id: string, input: any) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');
    return this.prisma.project.update({
      where: { id },
      data: {
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : input.startDate === '' ? null : undefined,
        technologyId: input.technologyId || null,
        primaryMentorId: input.primaryMentorId || null,
        secondaryMentorId: input.secondaryMentorId || null,
      },
    });
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
    return updated;
  }

  // --- Assignments ---

  async addAssignment(
    projectId: string,
    input: { employeeId: string; roleOnProject?: string; allocationPercent?: number; startDate?: string },
  ) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    const employee = await this.prisma.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee) throw new BadRequestException('Invalid employee');
    const assignment = await this.prisma.projectAssignment.create({
      data: {
        projectId,
        employeeId: input.employeeId,
        roleOnProject: input.roleOnProject,
        allocationPercent: input.allocationPercent ?? 100,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
      },
      include: { employee: { select: EMPLOYEE_REF_SELECT } },
    });
    await this.notifications.notifyEmployee(input.employeeId, {
      type: 'PROJECT_ASSIGNED',
      title: `You've been added to ${project.name}`,
      body: input.roleOnProject || undefined,
      employeeLink: '/',
      staffLink: `/projects/${projectId}`,
    });
    return assignment;
  }

  async updateAssignment(
    projectId: string,
    assignmentId: string,
    input: { roleOnProject?: string; allocationPercent?: number; endDate?: string | null },
  ) {
    const assignment = await this.prisma.projectAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.projectId !== projectId) throw new NotFoundException('Assignment not found');
    return this.prisma.projectAssignment.update({
      where: { id: assignmentId },
      data: {
        roleOnProject: input.roleOnProject,
        allocationPercent: input.allocationPercent,
        endDate: input.endDate === undefined ? undefined : input.endDate === null ? null : new Date(input.endDate),
      },
      include: { employee: { select: EMPLOYEE_REF_SELECT } },
    });
  }

  async removeAssignment(projectId: string, assignmentId: string) {
    const assignment = await this.prisma.projectAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.projectId !== projectId) throw new NotFoundException('Assignment not found');
    await this.prisma.projectAssignment.delete({ where: { id: assignmentId } });
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
