import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toISODate } from '../leave/leave-balance.util';

export interface EmployeeRef {
  id: string;
  fullName: string;
}

export interface LeaveDayEntry extends EmployeeRef {
  leaveTypeName: string;
  reason: string | null;
  dayPart: string;
}

export interface DayBreakdown {
  date: string;
  isWeekend: boolean;
  holiday: { name: string; region: string } | null;
  present: EmployeeRef[];
  onLeave: LeaveDayEntry[];
  absent: EmployeeRef[];
  // Checked in despite it being a non-working day — the calendar shows
  // these as "Present on Holiday" / "Present on Week-Off" rather than
  // silently dropping them, which is what happened before this existed.
  presentOnHoliday: EmployeeRef[];
  presentOnWeekend: EmployeeRef[];
}

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  private normalizeDate(d: Date | string): Date {
    const dt = new Date(d);
    return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
  }

  async checkIn(employeeId: string, date: Date, markedBy: string) {
    const day = this.normalizeDate(date);
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: day } },
    });
    if (existing) {
      throw new BadRequestException('Already marked present for this date');
    }
    return this.prisma.attendanceRecord.create({ data: { employeeId, date: day, markedBy } });
  }

  async today(employeeId: string) {
    const day = this.normalizeDate(new Date());
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: day } },
    });
    return {
      checkedIn: !!record,
      markedAt: record?.markedAt ?? null,
      checkedOut: !!record?.checkOutAt,
      checkOutAt: record?.checkOutAt ?? null,
    };
  }

  // Additive to check-in, not a replacement: logs the end of the workday
  // for whichever record already exists (today, or a specific date for a
  // staff correction). Feeds the late-arrival/half-day analytics in the
  // reports module — anyone who never clocks out just has no half-day
  // signal, which is the safe default (never guessed against them).
  async checkOut(employeeId: string, date: Date) {
    const day = this.normalizeDate(date);
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: day } },
    });
    if (!record) {
      throw new BadRequestException('No check-in on record for this date yet');
    }
    if (record.checkOutAt) {
      throw new BadRequestException('Already clocked out for this date');
    }
    return this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { checkOutAt: new Date() },
    });
  }

  // Full breakdown for a month. Pass employeeId to scope every bucket down
  // to just that one employee (used for a personal calendar) — the shape
  // stays the same either way so the frontend has one code path.
  async calendar(year: number, month: number, employeeId?: string): Promise<{ days: DayBreakdown[] }> {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));
    const daysInMonth = end.getUTCDate();
    const todayIso = toISODate(new Date());

    const employeeWhere: any = { status: 'ACTIVE' };
    if (employeeId) employeeWhere.id = employeeId;

    const [employees, holidays, leaveRequests, attendance] = await Promise.all([
      this.prisma.employee.findMany({
        where: employeeWhere,
        select: { id: true, fullName: true, dateOfJoining: true },
      }),
      this.prisma.holiday.findMany({ where: { date: { gte: start, lte: end } } }),
      this.prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          startDate: { lte: end },
          endDate: { gte: start },
          ...(employeeId ? { employeeId } : {}),
        },
        select: {
          employeeId: true,
          startDate: true,
          endDate: true,
          reason: true,
          dayPart: true,
          leaveType: { select: { name: true } },
        },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { date: { gte: start, lte: end }, ...(employeeId ? { employeeId } : {}) },
        select: { employeeId: true, date: true },
      }),
    ]);

    const holidayByDate = new Map<string, { name: string; region: string }>();
    for (const h of holidays) holidayByDate.set(toISODate(h.date), { name: h.name, region: h.region });

    const presentByDate = new Map<string, Set<string>>();
    for (const a of attendance) {
      const key = toISODate(a.date);
      if (!presentByDate.has(key)) presentByDate.set(key, new Set());
      presentByDate.get(key)!.add(a.employeeId);
    }

    const days: DayBreakdown[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(year, month - 1, d));
      const iso = toISODate(date);
      const dow = date.getUTCDay();
      const isWeekend = dow === 0 || dow === 6;
      const holiday = holidayByDate.get(iso) || null;
      const presentIds = presentByDate.get(iso) || new Set<string>();

      const present: EmployeeRef[] = [];
      const onLeave: LeaveDayEntry[] = [];
      const absent: EmployeeRef[] = [];
      const presentOnHoliday: EmployeeRef[] = [];
      const presentOnWeekend: EmployeeRef[] = [];

      for (const emp of employees) {
        if (emp.dateOfJoining && toISODate(emp.dateOfJoining) > iso) continue; // not yet joined

        const leaveMatch = leaveRequests.find(
          (r) => r.employeeId === emp.id && toISODate(r.startDate) <= iso && toISODate(r.endDate) >= iso,
        );
        if (leaveMatch) {
          onLeave.push({
            id: emp.id,
            fullName: emp.fullName,
            leaveTypeName: leaveMatch.leaveType.name,
            reason: leaveMatch.reason,
            dayPart: leaveMatch.dayPart,
          });
          continue;
        }

        if (presentIds.has(emp.id)) {
          if (isWeekend) presentOnWeekend.push({ id: emp.id, fullName: emp.fullName });
          else if (holiday) presentOnHoliday.push({ id: emp.id, fullName: emp.fullName });
          else present.push({ id: emp.id, fullName: emp.fullName });
          continue;
        }

        if (!isWeekend && !holiday && iso < todayIso) {
          absent.push({ id: emp.id, fullName: emp.fullName });
        }
        // else: a non-working day with no check-in (unremarkable), or
        // today/future not yet marked — left out of every bucket.
      }

      days.push({ date: iso, isWeekend, holiday, present, onLeave, absent, presentOnHoliday, presentOnWeekend });
    }

    return { days };
  }
}
