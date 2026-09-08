import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type UtilizationStatus = 'BENCH' | 'PARTIAL' | 'FULL' | 'OVER';

function statusFor(totalAllocation: number): UtilizationStatus {
  if (totalAllocation <= 0) return 'BENCH';
  if (totalAllocation < 100) return 'PARTIAL';
  if (totalAllocation === 100) return 'FULL';
  return 'OVER';
}

// Sums each active employee's allocationPercent across their currently-open
// assignments (endDate null) on projects that are still ACTIVE or ON_HOLD —
// a project that's been ended already closes out its assignments (see
// ProjectsService.end), so this naturally excludes completed/cancelled work
// without needing to filter it out again here.
@Injectable()
export class UtilizationService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const employees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        fullName: true,
        employeeCode: true,
        photoUrl: true,
        department: { select: { name: true } },
        designation: { select: { name: true } },
        projectAssignments: {
          where: { endDate: null, project: { status: { in: ['ACTIVE', 'ON_HOLD'] } } },
          select: {
            allocationPercent: true,
            roleOnProject: true,
            project: {
              select: { id: true, name: true, status: true, client: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const rows = employees.map((e) => {
      const totalAllocation = e.projectAssignments.reduce((sum, a) => sum + a.allocationPercent, 0);
      return {
        id: e.id,
        fullName: e.fullName,
        employeeCode: e.employeeCode,
        photoUrl: e.photoUrl,
        departmentName: e.department?.name || null,
        designationName: e.designation?.name || null,
        totalAllocation,
        status: statusFor(totalAllocation),
        assignments: e.projectAssignments.map((a) => ({
          projectId: a.project.id,
          projectName: a.project.name,
          projectStatus: a.project.status,
          clientName: a.project.client.name,
          allocationPercent: a.allocationPercent,
          roleOnProject: a.roleOnProject,
        })),
      };
    });

    const summary = {
      total: rows.length,
      bench: rows.filter((r) => r.status === 'BENCH').length,
      partial: rows.filter((r) => r.status === 'PARTIAL').length,
      full: rows.filter((r) => r.status === 'FULL').length,
      over: rows.filter((r) => r.status === 'OVER').length,
    };

    return { employees: rows, summary };
  }
}
