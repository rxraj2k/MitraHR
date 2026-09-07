import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Tracks extra days an employee worked (a weekend/holiday shift, approved
// overtime) so they can be converted into time off later. An entry only
// counts toward the employee's Compensatory Off balance once a staff member
// approves it — see LeaveRequestsService.computeBalance for how the balance
// is derived from these rows.
@Injectable()
export class CompOffService {
  constructor(private prisma: PrismaService) {}

  create(employeeId: string, input: { workedDate: string; reason: string; daysEarned?: number }) {
    const worked = new Date(input.workedDate);
    if (isNaN(worked.getTime())) throw new BadRequestException('Invalid worked date');
    if (worked > new Date()) throw new BadRequestException('Worked date cannot be in the future');
    return this.prisma.compOffLedger.create({
      data: {
        employeeId,
        workedDate: worked,
        reason: input.reason,
        daysEarned: input.daysEarned ?? 1,
        status: 'PENDING',
      },
    });
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
    return this.prisma.compOffLedger.update({
      where: { id },
      data: { status, decidedById, decisionNote, decidedAt: new Date() },
    });
  }
}
