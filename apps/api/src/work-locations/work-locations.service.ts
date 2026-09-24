import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertWorkLocationInput {
  name: string;
  region?: string | null;
  active?: boolean;
}

// Managed lookup list (Master Data — Locations tab). Employee.workLocation
// stays a plain free-text string, matched here by name for usage counts and
// the delete guard — see the schema comment on WorkLocation.
@Injectable()
export class WorkLocationsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.workLocation.findMany({ orderBy: { name: 'asc' } });
    const counts = await Promise.all(rows.map((r) => this.prisma.employee.count({ where: { workLocation: r.name } })));
    return rows.map((r, i) => ({
      ...r,
      usageCount: counts[i],
      usageLabel: counts[i] === 1 ? 'employee based here' : 'employees based here',
    }));
  }

  create(input: UpsertWorkLocationInput) {
    return this.prisma.workLocation.create({ data: { name: input.name, region: input.region || undefined } });
  }

  async update(id: string, input: UpsertWorkLocationInput) {
    const existing = await this.prisma.workLocation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Work location not found');
    return this.prisma.workLocation.update({
      where: { id },
      data: { name: input.name, region: input.region ?? null, active: input.active },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.workLocation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Work location not found');
    const inUse = await this.prisma.employee.count({ where: { workLocation: existing.name } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete: ${inUse} employee${inUse === 1 ? ' is' : 's are'} based at this location. Mark it inactive instead.`,
      );
    }
    await this.prisma.workLocation.delete({ where: { id } });
    return { success: true };
  }
}
