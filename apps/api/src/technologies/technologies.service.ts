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

  async findAll(category?: string) {
    const rows = await this.prisma.technology.findMany({
      where: { category: category || undefined },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    const counts = await Promise.all(rows.map((r) => this.countUsage(r.id)));
    return rows.map((r, i) => ({
      ...r,
      usageCount: counts[i],
      usageLabel: counts[i] === 1 ? 'project uses this' : 'projects use this',
    }));
  }

  // Counts both the legacy single "primary technology" relation and the
  // current multi-select tech-stack tags, de-duplicated by project id, so
  // the badge/guard reflects every project actually using this technology.
  private async countUsage(technologyId: string): Promise<number> {
    const [primary, tagged] = await Promise.all([
      this.prisma.project.findMany({ where: { technologyId }, select: { id: true } }),
      this.prisma.project.findMany({ where: { technologies: { some: { id: technologyId } } }, select: { id: true } }),
    ]);
    return new Set([...primary, ...tagged].map((p) => p.id)).size;
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
    const inUse = await this.countUsage(id);
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
