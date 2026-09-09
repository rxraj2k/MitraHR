import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// Tracks extra days an employee worked (a weekend/holiday shift, approved
// overtime) so they can be converted into time off later. An entry only
// counts toward the employee's Compensatory Off balance once a staff member
// approves it — see LeaveRequestsService.computeBalance for how the balance
// is derived from these rows.
@Injectable()
export class CompOffService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(employeeId: string, input: { workedDate: string; reason: string; daysEarned?: number }) {
    const worked = new Date(input.workedDate);
    if (isNaN(worked.getTime())) throw new BadRequestException('Invalid worked date');
    if (worked > new Date()) throw new BadRequestException('Worked date cannot be in the future');
    const entry = await this.prisma.compOffLedger.create({
      data: {
        employeeId,
        workedDate: worked,
        reason: input.reason,
        daysEarned: input.daysEarned ?? 1,
        status: 'PENDING',
      },
      include: { employee: { select: { fullName: true } } },
    });
    await this.notifications.notifyAllStaff({
      type: 'COMP_OFF_SUBMITTED',
      title: `${entry.employee.fullName} logged a comp-off day`,
      body: input.reason,
      link: '/leave',
    });
    return entry;
  }

  findForEmployee(employeeId: string) {
    return this.prisma.compOffLedger.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll(filters: { employeeId?: string; status?: string }) {
    return this.prisma.compOffLedger.findMany({
      where: { employeeId: filters.employeeId || undefined, status: filters.status || undefined },
      include: { employee: { select: { id: true, fullName: true, employeeCode: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async decide(id: string, decidedById: string, status: 'APPROVED' | 'REJECTED', decisionNote?: string) {
    const entry = await this.prisma.compOffLedger.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Comp-off entry not found');
    if (entry.status !== 'PENDING') {
      throw new BadRequestException('Only pending entries can be approved or rejected');
    }
    const updated = await this.prisma.compOffLedger.update({
      where: { id },
      data: { status, decidedById, decisionNote, decidedAt: new Date() },
    });
    const verb = status === 'APPROVED' ? 'approved' : 'rejected';
    await this.notifications.notifyEmployee(entry.employeeId, {
      type: 'COMP_OFF_DECIDED',
      title: `Your comp-off entry was ${verb}`,
      body: decisionNote || undefined,
      employeeLink: '/my-leave',
      staffLink: '/leave',
    });
    return updated;
  }
}
