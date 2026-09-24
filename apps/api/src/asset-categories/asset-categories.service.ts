import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertAssetCategoryInput {
  name: string;
  kind?: string;
  active?: boolean;
}

// Managed lookup list (Master Data — Assets & Docs tab). See the schema
// comment on AssetCategory for why Asset.category stays a name-matched
// string rather than a hard foreign key.
@Injectable()
export class AssetCategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.assetCategory.findMany({ orderBy: { name: 'asc' } });
    const counts = await Promise.all(rows.map((r) => this.prisma.asset.count({ where: { category: r.name } })));
    return rows.map((r, i) => ({
      ...r,
      usageCount: counts[i],
      usageLabel: counts[i] === 1 ? 'asset uses this category' : 'assets use this category',
    }));
  }

  create(input: UpsertAssetCategoryInput) {
    return this.prisma.assetCategory.create({ data: { name: input.name, kind: input.kind || 'HARDWARE' } });
  }

  async update(id: string, input: UpsertAssetCategoryInput) {
    const existing = await this.prisma.assetCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Asset category not found');
    return this.prisma.assetCategory.update({
      where: { id },
      data: { name: input.name, kind: input.kind, active: input.active },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.assetCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Asset category not found');
    const inUse = await this.prisma.asset.count({ where: { category: existing.name } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete: ${inUse} asset${inUse === 1 ? '' : 's'} still use this category. Mark it inactive instead.`,
      );
    }
    await this.prisma.assetCategory.delete({ where: { id } });
    return { success: true };
  }
}
