import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertDocumentTypeInput {
  name: string;
  appliesTo: string;
  active?: boolean;
}

// Managed lookup list (Master Data — Assets & Docs tab). Covers both
// EmployeeDocument.documentType and CompanyDocument.category — see the
// schema comment on DocumentType for why both stay name-matched strings.
@Injectable()
export class DocumentTypesService {
  constructor(private prisma: PrismaService) {}

  async findAll(appliesTo?: string) {
    const rows = await this.prisma.documentType.findMany({
      where: appliesTo ? { appliesTo } : undefined,
      orderBy: [{ appliesTo: 'asc' }, { name: 'asc' }],
    });
    const counts = await Promise.all(
      rows.map((r) =>
        r.appliesTo === 'COMPANY'
          ? this.prisma.companyDocument.count({ where: { category: r.name } })
          : this.prisma.employeeDocument.count({ where: { documentType: r.name } }),
      ),
    );
    return rows.map((r, i) => ({
      ...r,
      usageCount: counts[i],
      usageLabel: counts[i] === 1 ? 'document uses this type' : 'documents use this type',
    }));
  }

  create(input: UpsertDocumentTypeInput) {
    return this.prisma.documentType.create({ data: { name: input.name, appliesTo: input.appliesTo } });
  }

  async update(id: string, input: Partial<UpsertDocumentTypeInput>) {
    const existing = await this.prisma.documentType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Document type not found');
    return this.prisma.documentType.update({
      where: { id },
      data: { name: input.name, appliesTo: input.appliesTo, active: input.active },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.documentType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Document type not found');
    const inUse =
      existing.appliesTo === 'COMPANY'
        ? await this.prisma.companyDocument.count({ where: { category: existing.name } })
        : await this.prisma.employeeDocument.count({ where: { documentType: existing.name } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete: ${inUse} document${inUse === 1 ? '' : 's'} still use this type. Mark it inactive instead.`,
      );
    }
    await this.prisma.documentType.delete({ where: { id } });
    return { success: true };
  }
}
