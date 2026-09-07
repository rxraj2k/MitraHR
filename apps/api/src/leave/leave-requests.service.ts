import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { countWorkingDays, monthsElapsedInYear, toISODate } from './leave-balance.util';

@Injectable()
export class LeaveRequestsService {
  constructor(private prisma: PrismaService) {}

  private async getHolidaySet(year: number): Promise<Set<string>> {
    const holidays = await this.prisma.holiday.findMany({
      where: { date: { gte: new Date(Date.UTC(year, 0, 1)), lte: new Date(Date.UTC(year, 11, 31)) } },
    });
    return new Set(holidays.map((h) => toISODate(h.date)));
  }

  // Balance for one employee/leaveType as of a given date. accrued/remaining
  // are null for unlimited types (e.g. Loss of Pay). Resets every calendar
  // year for now — carryForwardAllowed is stored on the type but rollover
  // across a year boundary isn't implemented yet.
  async computeBalance(employeeId: string, leaveTypeId: string, asOf: Date = new Date()) {
    const [employee, leaveType] = await Promise.all([
      this.prisma.employee.findUnique({ where: { id: employeeId } }),
      this.prisma.leaveType.findUnique({ where: { id: leaveTypeId } }),
    ]);
    if (!employee) throw new NotFoundException('Employee not found');
    if (!leaveType) throw new NotFoundException('Leave type not found');

    const yearStart = new Date(Date.UTC(asOf.getUTCFullYear(), 0, 1));
    const yearEnd = new Date(Date.UTC(asOf.getUTCFullYear(), 11, 31, 23, 59, 59));
    const usedAgg = await this.prisma.leaveRequest.aggregate({
      _sum: { totalDays: true },
      where: { employeeId, leaveTypeId, status: 'APPROVED', startDate: { gte: yearStart, lte: yearEnd } },
    });
    const used = usedAgg._sum.totalDays || 0;

    let accrued: number | null;
    if (leaveType.accrualMethod === 'NONE' || leaveType.annualQuota == null) {
      accrued = null;
    } else if (leaveType.accrualMethod === 'UPFRONT') {
      accrued = leaveType.annualQuota;
    } else {
      const months = monthsElapsedInYear(employee.dateOfJoining, asOf);
      accrued = Math.round((leaveType.annualQuota / 12) * months * 100) / 100;
    }

    return {
      leaveTypeId,
      leaveTypeName: leaveType.name,
      isPaid: leaveType.isPaid,
      annualQuota: leaveType.annualQuota,
      accrued,
      used: Math.round(used * 100) / 100,
      remaining: accrued == null ? null : Math.round((accrued - used) * 100) / 100,
    };
  }

  async balancesForEmployee(employeeId: string) {
    const types = await this.prisma.leaveType.findMany({ where: { active: true } });
    return Promise.all(types.map((t) => this.computeBalance(employeeId, t.id)));
  }

  async create(
    employeeId: string,
    input: { leaveTypeId: string; startDate: string; endDate: string; dayPart?: string; reason?: string },
  ) {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      throw new BadRequestException('Invalid date range');
    }
    const dayPart = input.dayPart || 'FULL';
    if (dayPart !== 'FULL' && toISODate(start) !== toISODate(end)) {
      throw new BadRequestException('Half-day requests must have the same start and end date');
    }
    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: input.leaveTypeId } });
    if (!leaveType || !leaveType.active) throw new BadRequestException('Invalid leave type');

    const holidaySet = await this.getHolidaySet(start.getUTCFullYear());
    if (end.getUTCFullYear() !== start.getUTCFullYear()) {
      const endHolidays = await this.getHolidaySet(end.getUTCFullYear());
      endHolidays.forEach((d) => holidaySet.add(d));
    }
    let totalDays = countWorkingDays(start, end, holidaySet);
    if (totalDays === 0) {
      throw new BadRequestException('Selected date(s) fall entirely on a weekend or holiday');
    }
    if (dayPart !== 'FULL') totalDays = 0.5;

    if (leaveType.annualQuota != null) {
      const balance = await this.computeBalance(employeeId, input.leaveTypeId, start);
      if (balance.remaining != null && totalDays > balance.remaining) {
        throw new BadRequestException(
          `Not enough ${leaveType.name} balance: ${balance.remaining} remaining, ${totalDays} requested`,
        );
      }
    }

    return this.prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId: input.leaveTypeId,
        startDate: start,
        endDate: end,
        dayPart,
        totalDays,
        reason: input.reason,
        status: 'PENDING',
      },
      include: { leaveType: true },
    });
  }

  findForEmployee(employeeId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { employeeId },
      include: { leaveType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll(filters: { employeeId?: string; status?: string }) {
    return this.prisma.leaveRequest.findMany({
      where: { employeeId: filters.employeeId || undefined, status: filters.status || undefined },
      include: { leaveType: true, employee: { select: { id: true, fullName: true, employeeCode: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async decide(id: string, decidedById: string, status: 'APPROVED' | 'REJECTED', decisionNote?: string) {
    const request = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Leave request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only pending requests can be approved or rejected');
    }
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status, decidedById, decisionNote, decidedAt: new Date() },
      include: { leaveType: true },
    });
  }

  async cancel(id: string, requester: { kind: string; sub: string }) {
    const request = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Leave request not found');
    if (requester.kind === 'EMPLOYEE') {
      if (request.employeeId !== requester.sub) throw new ForbiddenException('Not your leave request');
      if (request.status !== 'PENDING') throw new BadRequestException('Only a pending request can be cancelled');
    } else if (!['PENDING', 'APPROVED'].includes(request.status)) {
      throw new BadRequestException('This request cannot be cancelled');
    }
    return this.prisma.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async calendar(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    const [requests, holidays] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: { status: 'APPROVED', startDate: { lte: end }, endDate: { gte: start } },
        include: { leaveType: true, employee: { select: { id: true, fullName: true } } },
      }),
      this.prisma.holiday.findMany({ where: { date: { gte: start, lte: end } } }),
    ]);
    return { requests, holidays };
  }
}
