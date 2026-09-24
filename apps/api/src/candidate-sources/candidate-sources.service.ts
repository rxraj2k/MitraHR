import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertCandidateSourceInput {
  name: string;
  active?: boolean;
}

// Managed lookup list (Master Data — Clients & Hiring tab). Candidate.source stays a
// plain free-text string, matched here by name for usage counts and the delete guard —
// see the schema comment on CandidateSource.
@Injectable()
export class CandidateSourcesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.candidateSource.findMany({ orderBy: { name: 'asc' } });
    const counts = await Promise.all(
      rows.map((r) => this.prisma.candidate.count({ where: { source: r.name } })),
    );
    return rows.map((r, i) => ({
      ...r,
      usageCount: counts[i],
      usageLabel: counts[i] === 1 ? 'candidate came from here' : 'candidates came from here',
    }));
  }

  create(input: UpsertCandidateSourceInput) {
    return this.prisma.candidateSource.create({ data: { name: input.name } });
  }

  async update(id: string, input: UpsertCandidateSourceInput) {
    const existing = await this.prisma.candidateSource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Candidate source not found');
    return this.prisma.candidateSource.update({
      where: { id },
      data: { name: input.name, active: input.active },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.candidateSource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Candidate source not found');
    const inUse = await this.prisma.candidate.count({ where: { source: existing.name } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete: ${inUse} candidate${inUse === 1 ? ' came' : 's came'} from this source. Mark it inactive instead.`,
      );
    }
    await this.prisma.candidateSource.delete({ where: { id } });
    return { success: true };
  }
}
