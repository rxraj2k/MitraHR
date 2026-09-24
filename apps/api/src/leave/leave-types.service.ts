import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertLeaveTypeInput {
  name: string;
  code?: string;
  annualQuota?: number | null;
  accrualMethod: string;
  isPaid: boolean;
  carryForwardAllowed: boolean;
  isCompOff?: boolean;
  active?: boolean;
}

@Injectable()
export class LeaveTypesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.leaveType.findMany({ orderBy: { name: 'asc' } });
    const counts = await Promise.all(rows.map((r) => this.prisma.leaveRequest.count({ where: { leaveTypeId: r.id } })));
    return rows.map((r, i) => ({
      ...r,
      usageCount: counts[i],
      usageLabel: counts[i] === 1 ? 'leave request uses this' : 'leave requests use this',
    }));
  }

  create(input: UpsertLeaveTypeInput) {
    return this.prisma.leaveType.create({
      data: { ...input, code: input.code || undefined, annualQuota: input.annualQuota ?? null },
    });
  }

  async update(id: string, input: UpsertLeaveTypeInput) {
    const existing = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Leave type not found');
    return this.prisma.leaveType.update({
      where: { id },
      data: { ...input, code: input.code || undefined, annualQuota: input.annualQuota ?? null },
    });
  }

  async remove(id: string) {
    const inUse = await this.prisma.leaveRequest.count({ where: { leaveTypeId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete: ${inUse} leave request${inUse === 1 ? '' : 's'} already use this leave type. Mark it inactive instead.`,
      );
    }
    const existing = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Leave type not found');
    await this.prisma.leaveType.delete({ where: { id } });
    return { success: true };
  }
}
