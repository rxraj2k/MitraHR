import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const COURSE_INCLUDE = { resources: { orderBy: { order: 'asc' as const } } };

@Injectable()
export class TrainingService {
  constructor(private prisma: PrismaService) {}

  // --- Catalog (staff-only management) ---

  findAllCourses(includeInactive = false) {
    return this.prisma.trainingCourse.findMany({
      where: includeInactive ? undefined : { active: true },
      include: COURSE_INCLUDE,
      orderBy: [{ category: 'asc' }, { order: 'asc' }, { title: 'asc' }],
    });
  }

  async createCourse(input: {
    title: string;
    category: string;
    description?: string;
    restrictedTo?: string;
    active?: boolean;
    order?: number;
    resources?: { label?: string; url: string }[];
  }) {
    return this.prisma.trainingCourse.create({
      data: {
        title: input.title,
        category: input.category,
        description: input.description || undefined,
        restrictedTo: input.restrictedTo || undefined,
        active: input.active ?? true,
        order: input.order ?? 0,
        resources: input.resources?.length
          ? { create: input.resources.map((r, i) => ({ label: r.label || undefined, url: r.url, order: i })) }
          : undefined,
      },
      include: COURSE_INCLUDE,
    });
  }

  async updateCourse(
    id: string,
    input: {
      title?: string;
      category?: string;
      description?: string;
      restrictedTo?: string;
      active?: boolean;
      order?: number;
      resources?: { label?: string; url: string }[];
    },
  ) {
    const existing = await this.prisma.trainingCourse.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Course not found');

    // Resources are small in number and replaced wholesale on edit — simpler
    // and safer than trying to diff/reconcile individual link rows.
    if (input.resources) {
      await this.prisma.trainingResource.deleteMany({ where: { courseId: id } });
    }

    return this.prisma.trainingCourse.update({
      where: { id },
      data: {
        title: input.title,
        category: input.category,
        description: input.description === '' ? null : input.description,
        restrictedTo: input.restrictedTo === '' ? null : input.restrictedTo,
        active: input.active,
        order: input.order,
        resources: input.resources?.length
          ? { create: input.resources.map((r, i) => ({ label: r.label || undefined, url: r.url, order: i })) }
          : undefined,
      },
      include: COURSE_INCLUDE,
    });
  }

  async removeCourse(id: string) {
    const inUse = await this.prisma.employeeTraining.count({ where: { courseId: id } });
    if (inUse > 0) {
      throw new BadRequestException('This course has been assigned to employees — mark it inactive instead of deleting it');
    }
    const existing = await this.prisma.trainingCourse.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Course not found');
    await this.prisma.trainingCourse.delete({ where: { id } });
    return { success: true };
  }

  // --- Assignments ---

  // One upsert per (employee, course) pair — idempotent, so re-assigning an
  // already-assigned course (e.g. re-running "assign standard curriculum"
  // after adding one new course) never errors or duplicates progress.
  async assign(employeeIds: string[], courseIds: string[]) {
    await Promise.all(
      employeeIds.flatMap((employeeId) =>
        courseIds.map((courseId) =>
          this.prisma.employeeTraining.upsert({
            where: { employeeId_courseId: { employeeId, courseId } },
            update: {},
            create: { employeeId, courseId },
          }),
        ),
      ),
    );
    return { success: true };
  }

  async updateStatus(id: string, status: string, actingEmployeeId?: string) {
    const assignment = await this.prisma.employeeTraining.findUnique({ where: { id } });
    if (!assignment) throw new NotFoundException('Training assignment not found');
    if (actingEmployeeId && assignment.employeeId !== actingEmployeeId) {
      throw new ForbiddenException('This is not your training assignment');
    }
    return this.prisma.employeeTraining.update({
      where: { id },
      data: {
        status,
        startedAt: status !== 'NOT_STARTED' && !assignment.startedAt ? new Date() : undefined,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    });
  }

  async removeAssignment(id: string) {
    const existing = await this.prisma.employeeTraining.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Training assignment not found');
    await this.prisma.employeeTraining.delete({ where: { id } });
    return { success: true };
  }

  // An employee's own assigned courses, with full course + resource detail
  // for the colorful "My Learning" view.
  findForEmployee(employeeId: string) {
    return this.prisma.employeeTraining.findMany({
      where: { employeeId },
      include: { course: { include: COURSE_INCLUDE } },
      orderBy: [{ course: { category: 'asc' } }, { course: { order: 'asc' } }],
    });
  }

  // One row per active employee with their assignment counts — feeds the
  // Team Progress table, and the same shape the Bench & Utilization view
  // uses to flag "In Training".
  async getProgressSummary() {
    const employees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        fullName: true,
        employeeCode: true,
        photoUrl: true,
        department: { select: { name: true } },
        designation: { select: { name: true } },
        trainingAssignments: { select: { status: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    return employees.map((e) => {
      const totalAssigned = e.trainingAssignments.length;
      const completed = e.trainingAssignments.filter((a) => a.status === 'COMPLETED').length;
      const inProgress = e.trainingAssignments.filter((a) => a.status === 'IN_PROGRESS').length;
      return {
        id: e.id,
        fullName: e.fullName,
        employeeCode: e.employeeCode,
        photoUrl: e.photoUrl,
        departmentName: e.department?.name || null,
        designationName: e.designation?.name || null,
        totalAssigned,
        completed,
        inProgress,
        percentComplete: totalAssigned === 0 ? 0 : Math.round((completed / totalAssigned) * 100),
      };
    });
  }
}
