import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertTechnologyInput {
  name: string;
  category: string;
  active?: boolean;
}

@Injectable()
export class TechnologiesService {
  constructor(private prisma: PrismaService) {}

  findAll(category?: string) {
    return this.prisma.technology.findMany({
      where: { category: category || undefined },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  create(input: UpsertTechnologyInput) {
    return this.prisma.technology.create({ data: input });
  }

  async update(id: string, input: UpsertTechnologyInput) {
    const existing = await this.prisma.technology.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Technology not found');
    return this.prisma.technology.update({ where: { id }, data: input });
  }

  async remove(id: string) {
    const inUse = await this.prisma.project.count({ where: { technologyId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete: ${inUse} project${inUse === 1 ? '' : 's'} use this technology. Mark it inactive instead.`,
      );
    }
    const existing = await this.prisma.technology.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Technology not found');
    await this.prisma.technology.delete({ where: { id } });
    return { success: true };
  }
}
