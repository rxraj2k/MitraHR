import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const EMPLOYEE_CARD_SELECT = {
  id: true,
  fullName: true,
  employeeCode: true,
  photoUrl: true,
  department: { select: { name: true } },
  designation: { select: { name: true } },
};

// Purely a "what-if" planning surface: it reads real employees/projects but
// writes only to SandboxPlacement, never to ProjectAssignment — dragging a
// card around here can never create a real assignment or fire a
// notification. Whoever's happy with a shuffle makes it official the normal
// way, on the Project detail page.
@Injectable()
export class StaffingSandboxService {
  constructor(private prisma: PrismaService) {}

  async getBoard() {
    const [employees, projects, placements] = await Promise.all([
      this.prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: EMPLOYEE_CARD_SELECT,
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.project.findMany({
        where: { status: { in: ['ACTIVE', 'ON_HOLD'] } },
        select: { id: true, name: true, status: true, client: { select: { name: true } } },
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
      const card = {
        id: emp.id,
        fullName: emp.fullName,
        employeeCode: emp.employeeCode,
        photoUrl: emp.photoUrl,
        departmentName: emp.department?.name || null,
        designationName: emp.designation?.name || null,
      };
      const placedProjectId = placementByEmployee.get(emp.id);
      if (placedProjectId && projectIds.has(placedProjectId)) {
        columns[placedProjectId].push(card);
      } else {
        columns.bench.push(card);
      }
    }

    return {
      projects: projects.map((p) => ({ id: p.id, name: p.name, status: p.status, clientName: p.client.name })),
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
}
