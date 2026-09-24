import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DesignationsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.designation.findMany({ orderBy: { name: 'asc' } });
    const counts = await Promise.all(rows.map((r) => this.prisma.employee.count({ where: { designationId: r.id } })));
    return rows.map((r, i) => ({
      ...r,
      usageCount: counts[i],
      usageLabel: counts[i] === 1 ? 'employee holds this' : 'employees hold this',
    }));
  }

  create(name: string) {
    return this.prisma.designation.create({ data: { name } });
  }

  async update(id: string, name: string) {
    const existing = await this.prisma.designation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Designation not found');
    return this.prisma.designation.update({ where: { id }, data: { name } });
  }

  async remove(id: string) {
    const inUse = await this.prisma.employee.count({ where: { designationId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete: ${inUse} employee${inUse === 1 ? '' : 's'} still hold this designation.`,
      );
    }
    const existing = await this.prisma.designation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Designation not found');
    await this.prisma.designation.delete({ where: { id } });
    return { success: true };
  }
}
