import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type UtilizationStatus = 'BENCH' | 'IN_TRAINING' | 'PARTIAL' | 'FULL' | 'OVER';

export function statusFor(totalAllocation: number, hasIncompleteTraining: boolean): UtilizationStatus {
  if (totalAllocation <= 0) return hasIncompleteTraining ? 'IN_TRAINING' : 'BENCH';
  if (totalAllocation < 100) return 'PARTIAL';
  if (totalAllocation === 100) return 'FULL';
  return 'OVER';
}

// Sums each active employee's allocationPercent across their currently-open
// assignments (endDate null) on projects that are still ACTIVE or ON_HOLD —
// a project that's been ended already closes out its assignments (see
// ProjectsService.end), so this naturally excludes completed/cancelled work
// without needing to filter it out again here. Anyone at 0% allocation who
// still has incomplete onboarding training assigned reads as "In Training"
// rather than "On Bench" — they're not idle, they're ramping up.
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
            id: true,
            allocationPercent: true,
            roleOnProject: true,
            project: {
              select: { id: true, name: true, status: true, client: { select: { id: true, name: true } } },
            },
          },
        },
        trainingAssignments: { select: { status: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    const rows = employees.map((e) => {
      const totalAllocation = e.projectAssignments.reduce((sum, a) => sum + a.allocationPercent, 0);
      const trainingTotal = e.trainingAssignments.length;
      const trainingCompleted = e.trainingAssignments.filter((a) => a.status === 'COMPLETED').length;
      const hasIncompleteTraining = trainingTotal > trainingCompleted;
      return {
        id: e.id,
        fullName: e.fullName,
        employeeCode: e.employeeCode,
        photoUrl: e.photoUrl,
        departmentName: e.department?.name || null,
        designationName: e.designation?.name || null,
        totalAllocation,
        status: statusFor(totalAllocation, hasIncompleteTraining),
        trainingTotal,
        trainingCompleted,
        assignments: e.projectAssignments.map((a) => ({
          assignmentId: a.id,
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
      inTraining: rows.filter((r) => r.status === 'IN_TRAINING').length,
      partial: rows.filter((r) => r.status === 'PARTIAL').length,
      full: rows.filter((r) => r.status === 'FULL').length,
      over: rows.filter((r) => r.status === 'OVER').length,
    };

    return { employees: rows, summary };
  }
}
