import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertCriterionDto } from './dto/upsert-criterion.dto';

@Injectable()
export class AppraisalCriteriaService {
  constructor(private prisma: PrismaService) {}

  // usageCount mirrors every other Master Data lookup (Departments,
  // Designations, Skills, ...): a real, per-row count of how many
  // AppraisalCriterionScore rows reference this criterion, so the frontend
  // can show a "N appraisals scored" badge and proactively disable delete
  // — consistent with remove()'s own server-side guard below, instead of
  // the two being out of sync.
  async findAll() {
    const rows = await this.prisma.appraisalCriterion.findMany({ orderBy: { sortOrder: 'asc' } });
    const counts = await Promise.all(
      rows.map((r) => this.prisma.appraisalCriterionScore.count({ where: { criterionId: r.id } })),
    );
    return rows.map((r, i) => ({
      ...r,
      usageCount: counts[i],
      usageLabel: counts[i] === 1 ? 'appraisal scored against this' : 'appraisals scored against this',
    }));
  }

  async create(dto: UpsertCriterionDto) {
    const maxOrder = await this.prisma.appraisalCriterion.aggregate({ _max: { sortOrder: true } });
    return this.prisma.appraisalCriterion.create({
      data: {
        name: dto.name,
        description: dto.description,
        weight: dto.weight,
        sortOrder: dto.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpsertCriterionDto) {
    const existing = await this.prisma.appraisalCriterion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Appraisal criterion not found');
    return this.prisma.appraisalCriterion.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        weight: dto.weight,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        active: dto.active ?? existing.active,
      },
    });
  }

  // A criterion already scored on a past appraisal can't be deleted outright
  // — that would silently blank out historical review data — so once it's
  // been used, retiring it (active: false, via update) is the only option.
  async remove(id: string) {
    const existing = await this.prisma.appraisalCriterion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Appraisal criterion not found');
    const inUse = await this.prisma.appraisalCriterionScore.count({ where: { criterionId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete: ${inUse} appraisal${inUse === 1 ? '' : 's'} already scored against this criterion. Mark it inactive instead.`,
      );
    }
    await this.prisma.appraisalCriterion.delete({ where: { id } });
    return { success: true };
  }
}
