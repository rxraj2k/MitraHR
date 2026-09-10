import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';
import { UtilizationService } from '../utilization/utilization.service';
import { toISODate } from '../leave/leave-balance.util';

const EMPLOYEE_REF_SELECT = { id: true, fullName: true, employeeCode: true, photoUrl: true };

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type TenureBucket = '<6 mos' | '6-12 mos' | '1-3 yrs' | '3+ yrs';

function tenureBucket(dateOfJoining: Date | null, asOf: Date): TenureBucket {
  if (!dateOfJoining) return '<6 mos';
  const months = (asOf.getTime() - dateOfJoining.getTime()) / (30.4375 * 86_400_000);
  if (months < 6) return '<6 mos';
  if (months < 12) return '6-12 mos';
  if (months < 36) return '1-3 yrs';
  return '3+ yrs';
}

function formatClockTime(d: Date): string {
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

function titleCaseDocumentType(documentType: string): string {
  return documentType
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

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

  // -------------------------------------------------------------------
  // Reports & Analytics preview (design-preview page at /reports-preview).
  // Everything below backs the parts of that page that have real data to
  // draw on. A few widgets on that page still show placeholder data
  // because the underlying feature doesn't exist yet (the recruitment
  // pipeline is Sprint 13; there's no client region/timezone-classification
  // field; there's no policy-acknowledgment tracking) — those stay mock on
  // the frontend rather than being faked here.
  // -------------------------------------------------------------------

  private async getActiveEmployeeDirectory() {
    const employees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        fullName: true,
        dateOfJoining: true,
        department: { select: { name: true } },
        designation: { select: { name: true } },
      },
    });
    return employees.map((e) => ({
      id: e.id,
      fullName: e.fullName,
      dateOfJoining: e.dateOfJoining,
      department: e.department?.name ?? 'Unassigned',
      designation: e.designation?.name ?? '—',
    }));
  }

  // Headcount + this-month joiners (real) plus an attendance-reliability
  // rate for the current month vs the previous one (real, computed the
  // same way the Sprint 11 attendance analytics does: present days over
  // present+absent days, excluding sanctioned leave from both sides so a
  // well-used leave policy never looks like unreliability).
  async previewOverview() {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

    const [headcount, newJoinersThisMonth] = await Promise.all([
      this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
      this.prisma.employee.count({ where: { status: 'ACTIVE', dateOfJoining: { gte: monthStart, lte: monthEnd } } }),
    ]);

    async function reliabilityRate(attendance: AttendanceService, year: number, month: number): Promise<number> {
      const { days } = await attendance.calendar(year, month);
      let present = 0;
      let absent = 0;
      for (const day of days) {
        present += day.present.length;
        absent += day.absent.length;
      }
      const total = present + absent;
      return total === 0 ? 0 : Math.round((present / total) * 1000) / 10;
    }

    const thisMonth = now.getUTCMonth() + 1;
    const thisYear = now.getUTCFullYear();
    const lastMonthDate = new Date(Date.UTC(thisYear, thisMonth - 2, 1));

    const [attendanceRatePercentThisMonth, attendanceRatePercentLastMonth] = await Promise.all([
      reliabilityRate(this.attendance, thisYear, thisMonth),
      reliabilityRate(this.attendance, lastMonthDate.getUTCFullYear(), lastMonthDate.getUTCMonth() + 1),
    ]);

    return { headcount, newJoinersThisMonth, attendanceRatePercentThisMonth, attendanceRatePercentLastMonth };
  }

  // 6-month trailing attendance mix, aggregated across every active
  // employee for each month (same absence definition as the team calendar).
  async previewAttendanceTrend(months = 6) {
    const now = new Date();
    const points: { month: string; present: number; paidLeave: number; unapprovedAbsence: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const { days } = await this.attendance.calendar(d.getUTCFullYear(), d.getUTCMonth() + 1);
      let present = 0;
      let onLeave = 0;
      let absent = 0;
      for (const day of days) {
        present += day.present.length;
        onLeave += day.onLeave.length;
        absent += day.absent.length;
      }
      const total = present + onLeave + absent;
      points.push({
        month: MONTH_LABELS[d.getUTCMonth()],
        present: total === 0 ? 0 : Math.round((present / total) * 1000) / 10,
        paidLeave: total === 0 ? 0 : Math.round((onLeave / total) * 1000) / 10,
        unapprovedAbsence: total === 0 ? 0 : Math.round((absent / total) * 1000) / 10,
      });
    }
    return points;
  }

  // Active employees, bucketed by department x time-in-company.
  async previewTenureSpread() {
    const employees = await this.getActiveEmployeeDirectory();
    const now = new Date();
    const byDept = new Map<string, { department: string; lt6mo: number; m6to12: number; y1to3: number; y3plus: number }>();
    for (const e of employees) {
      const entry = byDept.get(e.department) || { department: e.department, lt6mo: 0, m6to12: 0, y1to3: 0, y3plus: 0 };
      const bucket = tenureBucket(e.dateOfJoining, now);
      if (bucket === '<6 mos') entry.lt6mo += 1;
      else if (bucket === '6-12 mos') entry.m6to12 += 1;
      else if (bucket === '1-3 yrs') entry.y1to3 += 1;
      else entry.y3plus += 1;
      byDept.set(e.department, entry);
    }
    return Array.from(byDept.values()).sort((a, b) => a.department.localeCompare(b.department));
  }

  // Trailing-30-day, per-employee-per-workday punctuality ledger. Sanctioned
  // leave days are left out on purpose (this ledger is about
  // presence/lateness, not leave-taking, which is already tracked
  // elsewhere) — everything else is a real AttendanceRecord or a computed
  // absence using the exact same definition as the team calendar.
  async previewAttendanceLedger() {
    const settings = await this.getAttendanceSettings();
    const [expH, expM] = settings.expectedStartTime.split(':').map((n) => parseInt(n, 10));
    const graceMs = settings.graceMinutes * 60_000;

    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - 29);
    const todayIso = toISODate(today);

    const employees = await this.getActiveEmployeeDirectory();

    const [holidays, leaveRequests, records] = await Promise.all([
      this.prisma.holiday.findMany({ where: { date: { gte: start, lte: today } } }),
      this.prisma.leaveRequest.findMany({
        where: { status: 'APPROVED', startDate: { lte: today }, endDate: { gte: start } },
        select: { employeeId: true, startDate: true, endDate: true },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { date: { gte: start, lte: today } },
        select: { employeeId: true, date: true, markedAt: true, checkOutAt: true },
      }),
    ]);

    const holidaySet = new Set(holidays.map((h) => toISODate(h.date)));
    const recordByKey = new Map<string, (typeof records)[number]>();
    for (const r of records) recordByKey.set(`${r.employeeId}|${toISODate(r.date)}`, r);

    const rows: {
      id: string;
      name: string;
      department: string;
      date: string;
      checkIn: string;
      checkOut: string;
      status: 'On Time' | 'Late' | 'Absent';
      lateByMinutes: number;
    }[] = [];

    for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = toISODate(d);
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6 || holidaySet.has(iso)) continue;

      for (const emp of employees) {
        if (emp.dateOfJoining && toISODate(emp.dateOfJoining) > iso) continue;
        const onLeave = leaveRequests.some(
          (lr) => lr.employeeId === emp.id && toISODate(lr.startDate) <= iso && toISODate(lr.endDate) >= iso,
        );
        if (onLeave) continue;

        const record = recordByKey.get(`${emp.id}|${iso}`);
        if (record) {
          const expected = new Date(record.markedAt);
          expected.setHours(expH, expM, 0, 0);
          const lateMs = record.markedAt.getTime() - (expected.getTime() + graceMs);
          const isLate = lateMs > 0;
          rows.push({
            id: `${emp.id}-${iso}`,
            name: emp.fullName,
            department: emp.department,
            date: iso,
            checkIn: formatClockTime(record.markedAt),
            checkOut: record.checkOutAt ? formatClockTime(record.checkOutAt) : '—',
            status: isLate ? 'Late' : 'On Time',
            lateByMinutes: isLate ? Math.round(lateMs / 60_000) : 0,
          });
        } else if (iso < todayIso) {
          rows.push({
            id: `${emp.id}-${iso}`,
            name: emp.fullName,
            department: emp.department,
            date: iso,
            checkIn: '—',
            checkOut: '—',
            status: 'Absent',
            lateByMinutes: 0,
          });
        }
      }
    }

    return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }

  // Every active employee's tenure snapshot. lastPromotion is always
  // "Not tracked yet" — there's no designation-change-history model yet,
  // so this is left honest rather than guessed.
  async previewTenureMobility() {
    const employees = await this.getActiveEmployeeDirectory();
    const now = new Date();
    return employees
      .map((e) => ({
        id: e.id,
        name: e.fullName,
        department: e.department,
        designation: e.designation,
        joinDate: e.dateOfJoining ? toISODate(e.dateOfJoining) : '—',
        tenureBucket: tenureBucket(e.dateOfJoining, now),
        lastPromotion: 'Not tracked yet',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Rule-based (not machine-learned) risk flagging from real signals: a
  // burst of unapproved absences in the trailing 60 days, or zero leave
  // taken across 6 months despite meaningful tenure. Simple and explainable
  // on purpose — an actual predictive model is a fair-use/fairness-review
  // conversation for another day, not something to smuggle in here.
  async previewAttritionRisk() {
    const now = new Date();
    const start60 = new Date(now);
    start60.setUTCDate(start60.getUTCDate() - 60);
    const start180 = new Date(now);
    start180.setUTCDate(start180.getUTCDate() - 180);

    const employees = await this.getActiveEmployeeDirectory();

    const [holidays, leaveRequests60, leaveTotals180, records60] = await Promise.all([
      this.prisma.holiday.findMany({ where: { date: { gte: start60, lte: now } } }),
      this.prisma.leaveRequest.findMany({
        where: { status: 'APPROVED', startDate: { lte: now }, endDate: { gte: start60 } },
        select: { employeeId: true, startDate: true, endDate: true },
      }),
      this.prisma.leaveRequest.groupBy({
        by: ['employeeId'],
        _sum: { totalDays: true },
        where: { status: 'APPROVED', startDate: { gte: start180 } },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { date: { gte: start60, lte: now } },
        select: { employeeId: true, date: true },
      }),
    ]);

    const holidaySet = new Set(holidays.map((h) => toISODate(h.date)));
    const presentSet = new Set(records60.map((r) => `${r.employeeId}|${toISODate(r.date)}`));
    const leaveDaysByEmployee = new Map(leaveTotals180.map((g) => [g.employeeId, g._sum.totalDays || 0]));
    const todayIso = toISODate(now);

    const absenceCount = new Map<string, number>();
    for (let d = new Date(start60); d <= now; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = toISODate(d);
      if (iso >= todayIso) continue;
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6 || holidaySet.has(iso)) continue;
      for (const emp of employees) {
        if (emp.dateOfJoining && toISODate(emp.dateOfJoining) > iso) continue;
        const onLeave = leaveRequests60.some(
          (lr) => lr.employeeId === emp.id && toISODate(lr.startDate) <= iso && toISODate(lr.endDate) >= iso,
        );
        if (onLeave) continue;
        if (!presentSet.has(`${emp.id}|${iso}`)) {
          absenceCount.set(emp.id, (absenceCount.get(emp.id) || 0) + 1);
        }
      }
    }

    const flagged: { id: string; name: string; department: string; riskTier: 'High' | 'Medium'; reason: string; score: number }[] = [];
    for (const emp of employees) {
      const absences = absenceCount.get(emp.id) || 0;
      const leaveDays = leaveDaysByEmployee.get(emp.id) || 0;
      const tenureDays = emp.dateOfJoining ? (now.getTime() - emp.dateOfJoining.getTime()) / 86_400_000 : 0;

      if (absences >= 3) {
        flagged.push({
          id: emp.id,
          name: emp.fullName,
          department: emp.department,
          riskTier: 'High',
          reason: `${absences} unapproved absences in the last 60 days`,
          score: 100 + absences,
        });
      } else if (absences >= 1) {
        flagged.push({
          id: emp.id,
          name: emp.fullName,
          department: emp.department,
          riskTier: 'Medium',
          reason: `${absences} unapproved absence${absences > 1 ? 's' : ''} in the last 60 days`,
          score: 50 + absences,
        });
      } else if (tenureDays >= 180 && leaveDays === 0) {
        flagged.push({
          id: emp.id,
          name: emp.fullName,
          department: emp.department,
          riskTier: 'Medium',
          reason: `No leave taken in the last 6 months despite ${Math.floor(tenureDays / 30)} months' tenure`,
          score: 40,
        });
      }
    }

    return flagged
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ score, ...rest }) => rest);
  }

  // Two real, clickable signals (documents expiring soon; laptops sitting
  // unassigned in inventory) plus one honestly-blank one: there's no
  // policy-acknowledgment tracking anywhere in the app yet, so this stays
  // null rather than a made-up count.
  async previewComplianceRadar() {
    const in30Days = new Date();
    in30Days.setUTCDate(in30Days.getUTCDate() + 30);

    const [documentsExpiringSoon, unassignedLaptops] = await Promise.all([
      this.prisma.employeeDocument.count({
        where: { expiryDate: { not: null, lte: in30Days }, employee: { status: 'ACTIVE' } },
      }),
      this.prisma.asset.count({ where: { category: 'LAPTOP', status: 'AVAILABLE' } }),
    ]);

    return { documentsExpiringSoon, unassignedLaptops, pendingPolicySignatures: null as number | null };
  }

  // Every active employee's document with an expiry date (any type that
  // has one set — certifications and contracts are the common case),
  // labeled with the same status bands the daily expiry-notification job
  // already uses. Laptop assignment doesn't appear here — it's an
  // asset-centric fact ("this unit isn't handed out"), not an
  // employee-centric one, so it's surfaced via the radar card linking
  // straight to Asset Management instead of forced into this table's shape.
  async previewComplianceRoster() {
    const in30Days = new Date();
    in30Days.setUTCDate(in30Days.getUTCDate() + 30);
    const today = new Date();

    const docs = await this.prisma.employeeDocument.findMany({
      where: { expiryDate: { not: null }, employee: { status: 'ACTIVE' } },
      include: { employee: { select: { fullName: true, department: { select: { name: true } } } } },
      orderBy: { expiryDate: 'asc' },
    });

    return docs.map((d) => {
      const expiry = d.expiryDate as unknown as Date;
      const status = expiry < today ? 'Overdue' : expiry <= in30Days ? 'Due Soon' : 'Complete';
      return {
        id: d.id,
        name: d.employee.fullName,
        department: d.employee.department?.name ?? 'Unassigned',
        itemType: titleCaseDocumentType(d.documentType),
        status: status as 'Overdue' | 'Due Soon' | 'Complete',
        dueDate: toISODate(expiry),
      };
    });
  }
}
