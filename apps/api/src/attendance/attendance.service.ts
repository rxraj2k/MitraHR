import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toISODate } from '../leave/leave-balance.util';

export interface EmployeeRef {
  id: string;
  fullName: string;
}

export interface DayBreakdown {
  date: string;
  isWeekend: boolean;
  holiday: { name: string; region: string } | null;
  present: EmployeeRef[];
  onLeave: EmployeeRef[];
  absent: EmployeeRef[];
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
    return { checkedIn: !!record, markedAt: record?.markedAt ?? null };
  }

  // Full company breakdown for a month: for every active employee and every
  // day, exactly one of holiday/weekend, onLeave, present, absent, or
  // "not yet known" (today/future with no record) applies.
  async calendar(year: number, month: number): Promise<{ days: DayBreakdown[] }> {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));
    const daysInMonth = end.getUTCDate();
    const todayIso = toISODate(new Date());

    const [employees, holidays, leaveRequests, attendance] = await Promise.all([
      this.prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, fullName: true, dateOfJoining: true },
      }),
      this.prisma.holiday.findMany({ where: { date: { gte: start, lte: end } } }),
      this.prisma.leaveRequest.findMany({
        where: { status: 'APPROVED', startDate: { lte: end }, endDate: { gte: start } },
        select: { employeeId: true, startDate: true, endDate: true },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { date: { gte: start, lte: end } },
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
      const present: EmployeeRef[] = [];
      const onLeave: EmployeeRef[] = [];
      const absent: EmployeeRef[] = [];

      if (!isWeekend && !holiday) {
        const presentIds = presentByDate.get(iso) || new Set<string>();
        for (const emp of employees) {
          if (emp.dateOfJoining && toISODate(emp.dateOfJoining) > iso) continue; // not yet joined
          const onApprovedLeave = leaveRequests.some(
            (r) => r.employeeId === emp.id && toISODate(r.startDate) <= iso && toISODate(r.endDate) >= iso,
          );
          if (onApprovedLeave) {
            onLeave.push({ id: emp.id, fullName: emp.fullName });
          } else if (presentIds.has(emp.id)) {
            present.push({ id: emp.id, fullName: emp.fullName });
          } else if (iso < todayIso) {
            absent.push({ id: emp.id, fullName: emp.fullName });
          }
          // else: today/future, not yet marked — deliberately left out of
          // every bucket until the day actually happens.
        }
      }

      days.push({ date: iso, isWeekend, holiday, present, onLeave, absent });
    }

    return { days };
  }
}
