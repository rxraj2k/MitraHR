import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.department.findMany({ orderBy: { name: 'asc' } });
  }

  create(name: string) {
    return this.prisma.department.create({ data: { name } });
  }

  async update(id: string, name: string) {
    const existing = await this.prisma.department.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Department not found');
    return this.prisma.department.update({ where: { id }, data: { name } });
  }

  async remove(id: string) {
    const inUse = await this.prisma.employee.count({ where: { departmentId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete: ${inUse} employee${inUse === 1 ? '' : 's'} still assigned to this department.`,
      );
    }
    const existing = await this.prisma.department.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Department not found');
    await this.prisma.department.delete({ where: { id } });
    return { success: true };
  }
}
