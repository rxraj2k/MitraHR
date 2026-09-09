import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';
import { UtilizationService } from '../utilization/utilization.service';

const EMPLOYEE_REF_SELECT = { id: true, fullName: true, employeeCode: true, photoUrl: true };

// Everything here is read-only aggregation over data other modules already
// own (attendance, leave, projects, assets, training) — Sprint 11 adds no
// new source of truth except AttendanceSettings and the checkOutAt column.
@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private attendance: AttendanceService,
    private utilization: UtilizationService,
  ) {}

  async getAttendanceSettings() {
    const existing = await this.prisma.attendanceSettings.findUnique({ where: { id: 'default' } });
    if (existing) return existing;
    return this.prisma.attendanceSettings.create({ data: { id: 'default' } });
  }

  async updateAttendanceSettings(input: { expectedStartTime?: string; graceMinutes?: number; halfDayThresholdHours?: number }) {
    return this.prisma.attendanceSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...input },
      update: input,
    });
  }

  // Staff-only Home dashboard tiles. Every number here is a live query
  // against real records — no cached/derived counters to drift out of sync.
  async dashboardSummary() {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

    const [headcount, newJoinersThisMonth, leaveAgg, activeProjects, utilization, assetGroups, trainingGroups] =
      await Promise.all([
        this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
        this.prisma.employee.count({
          where: { status: 'ACTIVE', dateOfJoining: { gte: monthStart, lte: monthEnd } },
        }),
        // "Leave days this month" = approved requests whose start date falls
        // in the current calendar month — a dashboard tile, not a payroll
        // figure, so a multi-month leave isn't prorated across the split.
        this.prisma.leaveRequest.aggregate({
          _sum: { totalDays: true },
          where: { status: 'APPROVED', startDate: { gte: monthStart, lte: monthEnd } },
        }),
        this.prisma.project.count({ where: { status: { in: ['ACTIVE', 'ON_HOLD'] } } }),
        this.utilization.findAll(),
        this.prisma.asset.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.employeeTraining.groupBy({ by: ['status'], _count: { _all: true } }),
      ]);

    const trainingTotal = trainingGroups.reduce((sum, g) => sum + g._count._all, 0);
    const trainingCompleted = trainingGroups.find((g) => g.status === 'COMPLETED')?._count._all || 0;

    return {
      headcount,
      newJoinersThisMonth,
      leaveDaysThisMonth: Math.round((leaveAgg._sum.totalDays || 0) * 100) / 100,
      activeProjects,
      utilizationSummary: utilization.summary,
      assetStatusCounts: Object.fromEntries(assetGroups.map((g) => [g.status, g._count._all])),
      trainingCompletionPercent: trainingTotal ? Math.round((trainingCompleted / trainingTotal) * 100) : 0,
    };
  }

  // Reuses AttendanceService's own day-by-day "absent" bucket (same
  // definition already relied on by the team calendar: a past working day,
  // no check-in, no approved leave) so this can never disagree with what
  // the calendar shows for the same month.
  async absenteeism(year: number, month: number) {
    const { days } = await this.attendance.calendar(year, month);
    const byEmployee = new Map<string, { id: string; fullName: string; absentDays: number }>();
    for (const day of days) {
      for (const emp of day.absent) {
        const entry = byEmployee.get(emp.id) || { id: emp.id, fullName: emp.fullName, absentDays: 0 };
        entry.absentDays += 1;
        byEmployee.set(emp.id, entry);
      }
    }
    return Array.from(byEmployee.values()).sort((a, b) => b.absentDays - a.absentDays);
  }

  // Late arrival = marked-present after expectedStartTime + grace, compared
  // in server-local time-of-day. Half day = clocked out with total hours
  // below the configured threshold — silently skipped for anyone who never
  // clocks out, since there's nothing to compare for them.
  async attendanceAnalytics(year: number, month: number) {
    const settings = await this.getAttendanceSettings();
    const [expH, expM] = settings.expectedStartTime.split(':').map((n) => parseInt(n, 10));
    const graceMs = settings.graceMinutes * 60_000;

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    const records = await this.prisma.attendanceRecord.findMany({
      where: { date: { gte: start, lte: end } },
      include: { employee: { select: EMPLOYEE_REF_SELECT } },
    });

    const byEmployee = new Map<
      string,
      { id: string; fullName: string; presentDays: number; lateDays: number; halfDays: number }
    >();

    for (const r of records) {
      const entry = byEmployee.get(r.employeeId) || {
        id: r.employee.id,
        fullName: r.employee.fullName,
        presentDays: 0,
        lateDays: 0,
        halfDays: 0,
      };
      entry.presentDays += 1;

      const expected = new Date(r.markedAt);
      expected.setHours(expH, expM, 0, 0);
      if (r.markedAt.getTime() > expected.getTime() + graceMs) entry.lateDays += 1;

      if (r.checkOutAt) {
        const hoursWorked = (r.checkOutAt.getTime() - r.markedAt.getTime()) / 3_600_000;
        if (hoursWorked < settings.halfDayThresholdHours) entry.halfDays += 1;
      }

      byEmployee.set(r.employeeId, entry);
    }

    return {
      settings,
      rows: Array.from(byEmployee.values()).sort((a, b) => b.lateDays + b.halfDays - (a.lateDays + a.halfDays)),
    };
  }

  // Only projects that actually went through the formal "End Project"
  // workflow have a closureSummary — a project merely edited to CANCELLED
  // status never set one, so it correctly stays out of this report.
  async projectClosures() {
    const projects = await this.prisma.project.findMany({
      where: { closureSummary: { not: null } },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { endDate: 'desc' },
    });
    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      clientName: p.client.name,
      status: p.status,
      startDate: p.startDate,
      endDate: p.endDate,
      durationDays:
        p.startDate && p.endDate ? Math.round((p.endDate.getTime() - p.startDate.getTime()) / 86_400_000) : null,
      closureSummary: p.closureSummary,
    }));
  }
}
