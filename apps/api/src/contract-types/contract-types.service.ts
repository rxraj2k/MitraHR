import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertContractTypeInput {
  name: string;
  active?: boolean;
}

// Managed lookup list (Master Data — Clients & Hiring tab). ClientContract.contractType
// stays a plain free-text string, matched here by name for usage counts and the delete
// guard — see the schema comment on ContractType.
@Injectable()
export class ContractTypesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.contractType.findMany({ orderBy: { name: 'asc' } });
    const counts = await Promise.all(
      rows.map((r) => this.prisma.clientContract.count({ where: { contractType: r.name } })),
    );
    return rows.map((r, i) => ({
      ...r,
      usageCount: counts[i],
      usageLabel: counts[i] === 1 ? 'contract uses this' : 'contracts use this',
    }));
  }

  create(input: UpsertContractTypeInput) {
    return this.prisma.contractType.create({ data: { name: input.name } });
  }

  async update(id: string, input: UpsertContractTypeInput) {
    const existing = await this.prisma.contractType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Contract type not found');
    return this.prisma.contractType.update({
      where: { id },
      data: { name: input.name, active: input.active },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.contractType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Contract type not found');
    const inUse = await this.prisma.clientContract.count({ where: { contractType: existing.name } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete: ${inUse} contract${inUse === 1 ? ' uses' : 's use'} this type. Mark it inactive instead.`,
      );
    }
    await this.prisma.contractType.delete({ where: { id } });
    return { success: true };
  }
}
