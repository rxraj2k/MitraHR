import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';
import { UtilizationService } from '../utilization/utilization.service';
import { toISODate } from '../leave/leave-balance.util';
import { isUsDaylightSaving } from './us-dst.util';

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

// Recruitment stage -> the display labels Reports & Analytics already used
// for its (formerly mock) Recruitment Funnel tab, kept unchanged on the
// frontend so this is a pure data-source swap, not a UI rework.
const FUNNEL_STAGE_LABELS: Record<string, string> = {
  APPLIED: 'Applied',
  SCREENING_CALL: 'Screening',
  TECHNICAL_ROUND: 'L1 Technical',
  FINAL_ROUND: 'L2 Final Round',
  OFFER_EXTENDED: 'HR/Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};

export type PunctualityStatus = 'Early' | 'On Time' | 'Late' | 'Absent';

export interface PunctualityRow {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: PunctualityStatus;
  lateByMinutes: number;
  earlyByMinutes: number;
}

// Everything here is read-only aggregation over data other modules already
// own (attendance, leave, projects, assets, training, recruitment,
// performance, recognition, exits) — Sprint 11 added AttendanceSettings and
// checkOutAt as its only new source of truth; every sprint since has been
// wired in here as it landed rather than left as placeholder preview data.
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

  async updateAttendanceSettings(input: {
    expectedStartTime?: string;
    expectedStartTimeDst?: string;
    graceMinutes?: number;
    earlyThresholdMinutes?: number;
    halfDayThresholdHours?: number;
  }) {
    return this.prisma.attendanceSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...input },
      update: input,
    });
  }

  // This company's shift is aligned to fixed US client hours, so the
  // expected IST clock-in time itself shifts during US Daylight Saving even
  // though India never observes DST — see us-dst.util.ts for the calendar
  // rule. Every place that used to read `settings.expectedStartTime`
  // directly now goes through this helper instead, keyed off the specific
  // calendar date being evaluated (not "today"), so a trailing-30-day
  // report stays correct across a DST transition that falls inside it.
  private effectiveExpectedStart(
    settings: { expectedStartTime: string; expectedStartTimeDst: string },
    date: Date,
  ): [number, number] {
    const raw = isUsDaylightSaving(date) ? settings.expectedStartTimeDst : settings.expectedStartTime;
    const [h, m] = raw.split(':').map((n) => parseInt(n, 10));
    return [h, m];
  }

  // Staff-only Home dashboard tiles. Every number here is a live query
  // against real records — no cached/derived counters to drift out of sync.
  async dashboardSummary() {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

    const [
      headcount,
      newJoinersThisMonth,
      leaveAgg,
      activeProjects,
      utilization,
      assetGroups,
      trainingGroups,
      quizAttemptsTotal,
      quizAttemptsPassed,
    ] = await Promise.all([
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
      // Learning Center "Tests" tab — org-wide knowledge-check stats.
      this.prisma.quizAttempt.count(),
      this.prisma.quizAttempt.count({ where: { passed: true } }),
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
      quizAttemptsTotal,
      quizPassRatePercent: quizAttemptsTotal ? Math.round((quizAttemptsPassed / quizAttemptsTotal) * 100) : 0,
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

  // Legacy monthly punctuality summary (predates the Sprint 18 Attendance
  // Timeliness tab and isn't wired into any page today) — kept working and
  // DST-aware rather than removed, since deleting a working read-only
  // endpoint buys nothing. previewAttendanceTimeliness() below is the one
  // actually surfaced in Reports & Analytics.
  async attendanceAnalytics(year: number, month: number) {
    const settings = await this.getAttendanceSettings();
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

      const [expH, expM] = this.effectiveExpectedStart(settings, r.date);
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
  // As of Sprint 18 every widget and tab on that page draws on real data —
  // each sprint since Sprint 11 has been wired in here as it landed
  // (Client.region for US Client Alignment, CompanyDocumentAcknowledgment
  // for Pending Policy Signatures, DesignationHistory for Last Promotion,
  // Candidate/JobOpening for Recruitment Speed & the Funnel tab,
  // EmployeeExit for Turnover, and ReviewCycle/Goal/Recognition for the
  // Performance & Engagement widget) rather than left as placeholder mock
  // data on the frontend.
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

  // Shared trailing-N-day, per-employee-per-workday punctuality builder,
  // used by both the raw ledger (previewAttendanceLedger) and the
  // per-employee monthly summary (previewAttendanceTimeliness) so the two
  // views can never disagree about what counts as Early/Late/Absent.
  // Sanctioned leave days are left out on purpose (this is about
  // presence/lateness, not leave-taking, which is already tracked
  // elsewhere) — everything else is a real AttendanceRecord or a computed
  // absence using the exact same definition as the team calendar. The
  // expected start time is resolved per calendar day (not once up front)
  // since a DST transition can fall inside the window.
  private async buildPunctualityRows(daysBack: number): Promise<PunctualityRow[]> {
    const settings = await this.getAttendanceSettings();
    const graceMs = settings.graceMinutes * 60_000;
    const earlyMs = settings.earlyThresholdMinutes * 60_000;

    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - daysBack);
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

    const rows: PunctualityRow[] = [];

    for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = toISODate(d);
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6 || holidaySet.has(iso)) continue;
      const [expH, expM] = this.effectiveExpectedStart(settings, d);

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
          const diffMs = record.markedAt.getTime() - expected.getTime();

          let status: PunctualityStatus = 'On Time';
          let lateByMinutes = 0;
          let earlyByMinutes = 0;
          if (diffMs > graceMs) {
            status = 'Late';
            lateByMinutes = Math.round((diffMs - graceMs) / 60_000);
          } else if (diffMs < -earlyMs) {
            status = 'Early';
            earlyByMinutes = Math.round((-diffMs - earlyMs) / 60_000);
          }

          rows.push({
            id: `${emp.id}-${iso}`,
            employeeId: emp.id,
            name: emp.fullName,
            department: emp.department,
            date: iso,
            checkIn: formatClockTime(record.markedAt),
            checkOut: record.checkOutAt ? formatClockTime(record.checkOutAt) : '—',
            status,
            lateByMinutes,
            earlyByMinutes,
          });
        } else if (iso < todayIso) {
          rows.push({
            id: `${emp.id}-${iso}`,
            employeeId: emp.id,
            name: emp.fullName,
            department: emp.department,
            date: iso,
            checkIn: '—',
            checkOut: '—',
            status: 'Absent',
            lateByMinutes: 0,
            earlyByMinutes: 0,
          });
        }
      }
    }

    return rows;
  }

  // Trailing-30-day raw punctuality ledger — one row per employee per
  // workday. See buildPunctualityRows for the Early/On Time/Late/Absent
  // rule.
  async previewAttendanceLedger() {
    const rows = await this.buildPunctualityRows(29);
    return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }

  // Sprint 18: "who's logged in late, early, or on time" as its own
  // reporting section, distinct from the raw day-by-day ledger above —
  // company-wide KPI totals for the trailing 30 workdays, plus a
  // per-employee punctuality table (counts + average minutes late/early)
  // sorted worst-first so a manager can see who needs a conversation.
  async previewAttendanceTimeliness() {
    const settings = await this.getAttendanceSettings();
    const rows = await this.buildPunctualityRows(29);

    const totals = { early: 0, onTime: 0, late: 0, absent: 0 };
    const byEmployee = new Map<
      string,
      {
        id: string;
        name: string;
        department: string;
        earlyDays: number;
        onTimeDays: number;
        lateDays: number;
        absentDays: number;
        lateMinutesSum: number;
        earlyMinutesSum: number;
      }
    >();

    for (const r of rows) {
      if (r.status === 'Early') totals.early += 1;
      else if (r.status === 'On Time') totals.onTime += 1;
      else if (r.status === 'Late') totals.late += 1;
      else totals.absent += 1;

      const entry = byEmployee.get(r.employeeId) || {
        id: r.employeeId,
        name: r.name,
        department: r.department,
        earlyDays: 0,
        onTimeDays: 0,
        lateDays: 0,
        absentDays: 0,
        lateMinutesSum: 0,
        earlyMinutesSum: 0,
      };
      if (r.status === 'Early') {
        entry.earlyDays += 1;
        entry.earlyMinutesSum += r.earlyByMinutes;
      } else if (r.status === 'On Time') entry.onTimeDays += 1;
      else if (r.status === 'Late') {
        entry.lateDays += 1;
        entry.lateMinutesSum += r.lateByMinutes;
      } else entry.absentDays += 1;
      byEmployee.set(r.employeeId, entry);
    }

    const markedTotal = totals.early + totals.onTime + totals.late;
    const onTimeRatePercent = markedTotal === 0 ? 0 : Math.round(((totals.early + totals.onTime) / markedTotal) * 1000) / 10;

    const employeeRows = Array.from(byEmployee.values())
      .map((e) => ({
        id: e.id,
        name: e.name,
        department: e.department,
        earlyDays: e.earlyDays,
        onTimeDays: e.onTimeDays,
        lateDays: e.lateDays,
        absentDays: e.absentDays,
        avgLateMinutes: e.lateDays === 0 ? 0 : Math.round(e.lateMinutesSum / e.lateDays),
        avgEarlyMinutes: e.earlyDays === 0 ? 0 : Math.round(e.earlyMinutesSum / e.earlyDays),
      }))
      .sort((a, b) => b.lateDays - a.lateDays || b.earlyDays - a.earlyDays);

    return {
      windowDays: 29,
      expectedStartTime: settings.expectedStartTime,
      expectedStartTimeDst: settings.expectedStartTimeDst,
      totals: { ...totals, onTimeRatePercent },
      rows: employeeRows,
    };
  }

  // Every active employee's tenure snapshot. lastPromotion draws on the
  // real DesignationHistory audit trail added in Sprint 16 — an employee
  // whose designation has never changed since (or predates) that sprint
  // correctly has no history rows, so "Not tracked yet" is still shown for
  // them rather than guessed.
  async previewTenureMobility() {
    const employees = await this.getActiveEmployeeDirectory();
    const now = new Date();

    const latestHistoryByEmployee = await this.prisma.designationHistory.findMany({
      where: { employeeId: { in: employees.map((e) => e.id) } },
      orderBy: { changedAt: 'desc' },
      include: { toDesignation: { select: { name: true } } },
    });
    const lastPromotionByEmployee = new Map<string, string>();
    for (const h of latestHistoryByEmployee) {
      if (lastPromotionByEmployee.has(h.employeeId)) continue; // already have the most recent for this employee
      lastPromotionByEmployee.set(
        h.employeeId,
        `${toISODate(h.changedAt)} → ${h.toDesignation?.name ?? '—'}`,
      );
    }

    return employees
      .map((e) => ({
        id: e.id,
        name: e.fullName,
        department: e.department,
        designation: e.designation,
        joinDate: e.dateOfJoining ? toISODate(e.dateOfJoining) : '—',
        tenureBucket: tenureBucket(e.dateOfJoining, now),
        lastPromotion: lastPromotionByEmployee.get(e.id) ?? 'Not tracked yet',
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

  // Three real, clickable signals: documents expiring soon, laptops
  // sitting unassigned in inventory, and (Sprint 16) pending policy
  // signatures — summed across every POLICY company document as
  // max(0, activeEmployees - acknowledgedCount), so an employee who
  // joined after a policy was published still counts as pending for it.
  async previewComplianceRadar() {
    const in30Days = new Date();
    in30Days.setUTCDate(in30Days.getUTCDate() + 30);

    const [documentsExpiringSoon, unassignedLaptops, activeEmployeeCount, policyDocs] = await Promise.all([
      this.prisma.employeeDocument.count({
        where: { expiryDate: { not: null, lte: in30Days }, employee: { status: 'ACTIVE' } },
      }),
      this.prisma.asset.count({ where: { category: 'LAPTOP', status: 'AVAILABLE' } }),
      this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
      this.prisma.companyDocument.findMany({
        where: { category: 'POLICY' },
        include: { _count: { select: { acknowledgments: true } } },
      }),
    ]);

    const pendingPolicySignatures = policyDocs.reduce(
      (sum, d) => sum + Math.max(0, activeEmployeeCount - d._count.acknowledgments),
      0,
    );

    return { documentsExpiringSoon, unassignedLaptops, pendingPolicySignatures };
  }

  // Sprint 16: real US Client Alignment, replacing the previous hardcoded
  // preview widget now that Client has a structured `region` field instead
  // of only a free-text `timezone`. Overlap hours per region are a rough,
  // documented business-hours estimate (IST vs. US time zones), weighted by
  // each client's active project count so a client with several active US
  // engagements counts for more than one with a single small project.
  private static readonly US_REGION_META: Record<string, { label: string; overlapHours: number }> = {
    US_EAST: { label: 'Eastern Time (EST/EDT)', overlapHours: 5 },
    US_CENTRAL: { label: 'Central Time (CST/CDT)', overlapHours: 6 },
    US_MOUNTAIN: { label: 'Mountain Time (MST/MDT)', overlapHours: 7 },
    US_PACIFIC: { label: 'Pacific Time (PST/PDT)', overlapHours: 8 },
  };

  async previewUsClientAlignment() {
    const usClients = await this.prisma.client.findMany({
      where: { status: 'ACTIVE', region: { in: Object.keys(ReportsService.US_REGION_META) } },
      include: { projects: { where: { status: 'ACTIVE' }, select: { id: true } } },
    });

    const activeUsClients = usClients.length;
    const activeUsProjects = usClients.reduce((sum, c) => sum + c.projects.length, 0);

    if (activeUsProjects === 0) {
      return {
        timezoneOverlapPercent: 0,
        timezoneOverlapLabel: 'No active US client engagements yet',
        activeUsProjects: 0,
        activeUsClients,
      };
    }

    let overlapHourSum = 0;
    const regionProjectCounts = new Map<string, number>();
    for (const c of usClients) {
      const meta = ReportsService.US_REGION_META[c.region as string];
      if (!meta || c.projects.length === 0) continue;
      overlapHourSum += meta.overlapHours * c.projects.length;
      regionProjectCounts.set(c.region as string, (regionProjectCounts.get(c.region as string) || 0) + c.projects.length);
    }
    const avgOverlapHours = overlapHourSum / activeUsProjects;
    const timezoneOverlapPercent = Math.min(100, Math.round((avgOverlapHours / 8) * 100));

    const dominant = Array.from(regionProjectCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    const dominantLabel = dominant ? ReportsService.US_REGION_META[dominant[0]].label : 'US clients';

    return {
      timezoneOverlapPercent,
      timezoneOverlapLabel: `~${Math.round(avgOverlapHours * 10) / 10} hrs/day overlap with ${dominantLabel}`,
      activeUsProjects,
      activeUsClients,
    };
  }

  // Sprint 18: real Turnover Index, replacing the hardcoded KPI card, now
  // that Exit & Clearance (Sprint 12) tracks real exits. EmployeeExit has
  // no voluntary/involuntary classification field (its `reason` is free
  // text an HR admin fills in, not a fixed vocabulary), so this reports an
  // honest overall rate rather than inventing a split the data can't back.
  async previewTurnover() {
    const now = new Date();
    const start12mo = new Date(now);
    start12mo.setUTCFullYear(start12mo.getUTCFullYear() - 1);

    const [exitsTrailing12Months, activeHeadcount] = await Promise.all([
      this.prisma.employeeExit.count({ where: { resignationDate: { gte: start12mo, lte: now } } }),
      this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
    ]);

    // Average headcount ~ current active + those who left in the window
    // (a simple, explainable denominator rather than a true daily average).
    const avgHeadcount = activeHeadcount + exitsTrailing12Months;
    const turnoverRatePercent = avgHeadcount === 0 ? 0 : Math.round((exitsTrailing12Months / avgHeadcount) * 1000) / 10;

    return { turnoverRatePercent, exitsTrailing12Months };
  }

  // Sprint 18: real Recruitment Speed, replacing the hardcoded KPI card,
  // now that Recruitment/ATS (Sprint 13) has real openedAt -> hiredAt
  // timestamps. Falls back to null (not a made-up number) when nobody has
  // been hired through the ATS yet.
  async previewRecruitmentSpeed() {
    const hires = await this.prisma.candidate.findMany({
      where: { stage: 'HIRED', hiredAt: { not: null } },
      select: { hiredAt: true, jobOpening: { select: { openedAt: true } } },
      orderBy: { hiredAt: 'desc' },
      take: 20, // trailing 20 hires — enough to smooth outliers without going stale
    });

    if (hires.length === 0) {
      return { avgTimeToFillDays: null, hiresSampled: 0 };
    }

    const totalDays = hires.reduce(
      (sum, h) => sum + (h.hiredAt!.getTime() - h.jobOpening.openedAt.getTime()) / 86_400_000,
      0,
    );
    return { avgTimeToFillDays: Math.round(totalDays / hires.length), hiresSampled: hires.length };
  }

  // Sprint 18: real ATS & Recruitment Funnel, replacing the mock candidate
  // table now that Recruitment/ATS (Sprint 13) is the real source of truth.
  // Stage labels match what the funnel tab has always shown on the
  // frontend (FUNNEL_STAGE_LABELS mirrors the Kanban board's "Client Round"
  // relabeling of FINAL_ROUND).
  async previewRecruitmentFunnel() {
    const candidates = await this.prisma.candidate.findMany({
      include: { jobOpening: { select: { title: true } } },
      orderBy: { appliedAt: 'desc' },
    });
    return candidates.map((c) => ({
      id: c.id,
      candidate: c.fullName,
      role: c.jobOpening.title,
      source: c.source,
      appliedDate: toISODate(c.appliedAt),
      stage: FUNNEL_STAGE_LABELS[c.stage] ?? c.stage,
    }));
  }

  // Sprint 18: the one widget covering Performance & Goals (Sprint 14) and
  // Recognition (Sprint 15) on Reports & Analytics — neither had any
  // representation here before. Deliberately a single compact summary
  // rather than a full new tab per feature, since Reports already has a
  // dedicated home for each (/performance, /engagement) — this is a
  // pointer, not a duplicate.
  async previewPerformanceEngagement() {
    const now = new Date();
    const last30Days = new Date(now);
    last30Days.setUTCDate(last30Days.getUTCDate() - 30);

    const [activeCycle, kudosLast30Days] = await Promise.all([
      this.prisma.reviewCycle.findFirst({ where: { status: 'ACTIVE' }, orderBy: { startDate: 'desc' } }),
      this.prisma.recognition.count({ where: { createdAt: { gte: last30Days } } }),
    ]);

    if (!activeCycle) {
      return {
        activeCycleName: null,
        reviewsFinalizedCount: 0,
        reviewsTotalCount: 0,
        avgGoalProgressPercent: null,
        kudosLast30Days,
      };
    }

    const [reviews, goals] = await Promise.all([
      this.prisma.performanceReview.findMany({
        where: { reviewCycleId: activeCycle.id },
        select: { status: true },
      }),
      this.prisma.goal.findMany({ where: { reviewCycleId: activeCycle.id }, select: { progress: true } }),
    ]);

    const reviewsFinalizedCount = reviews.filter((r) => r.status === 'COMPLETED').length;
    const avgGoalProgressPercent =
      goals.length === 0 ? null : Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length);

    return {
      activeCycleName: activeCycle.name,
      reviewsFinalizedCount,
      reviewsTotalCount: reviews.length,
      avgGoalProgressPercent,
      kudosLast30Days,
    };
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
