import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertAssetVendorInput {
  name: string;
  active?: boolean;
}

// Managed lookup list (Master Data — Assets & Docs tab). Unlike
// AssetCategory, Asset.vendorId is a real foreign key (see schema comment
// on AssetVendor), so usage/delete checks below use it directly.
@Injectable()
export class AssetVendorsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.assetVendor.findMany({ orderBy: { name: 'asc' } });
    const counts = await Promise.all(rows.map((r) => this.prisma.asset.count({ where: { vendorId: r.id } })));
    return rows.map((r, i) => ({
      ...r,
      usageCount: counts[i],
      usageLabel: counts[i] === 1 ? 'asset from this vendor' : 'assets from this vendor',
    }));
  }

  create(input: UpsertAssetVendorInput) {
    return this.prisma.assetVendor.create({ data: { name: input.name } });
  }

  async update(id: string, input: UpsertAssetVendorInput) {
    const existing = await this.prisma.assetVendor.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vendor not found');
    return this.prisma.assetVendor.update({ where: { id }, data: { name: input.name, active: input.active } });
  }

  async remove(id: string) {
    const existing = await this.prisma.assetVendor.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vendor not found');
    const inUse = await this.prisma.asset.count({ where: { vendorId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete: ${inUse} asset${inUse === 1 ? '' : 's'} still linked to this vendor. Mark it inactive instead.`,
      );
    }
    await this.prisma.assetVendor.delete({ where: { id } });
    return { success: true };
  }
}
