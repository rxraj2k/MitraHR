import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertHolidayInput {
  name: string;
  date: string;
  region: string;
  type?: string;
}

@Injectable()
export class HolidaysService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.holiday.findMany({ orderBy: { date: 'asc' } });
  }

  create(input: UpsertHolidayInput) {
    return this.prisma.holiday.create({
      data: { name: input.name, date: new Date(input.date), region: input.region, type: input.type || 'NATIONAL' },
    });
  }

  async update(id: string, input: UpsertHolidayInput) {
    const existing = await this.prisma.holiday.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Holiday not found');
    return this.prisma.holiday.update({
      where: { id },
      data: { name: input.name, date: new Date(input.date), region: input.region, type: input.type || 'NATIONAL' },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.holiday.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Holiday not found');
    await this.prisma.holiday.delete({ where: { id } });
    return { success: true };
  }
}
