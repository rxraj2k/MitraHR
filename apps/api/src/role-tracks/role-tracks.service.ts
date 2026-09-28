import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertRoleTrackInput {
  name: string;
  active?: boolean;
}

// Managed lookup list (Master Data — Clients & Hiring tab). Candidate.roleTrack
// stays a plain free-text string, matched here by name for usage counts and the
// delete guard — see the schema comment on RoleTrack. This is the "which
// discipline is this candidate being considered for" tag (DevOps, IAM, Cyber
// Security, AI Intern, AI Engineer, ...), independent of which formal
// JobOpening requisition they're filed under.
@Injectable()
export class RoleTracksService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.roleTrack.findMany({ orderBy: { name: 'asc' } });
    const counts = await Promise.all(
      rows.map((r) => this.prisma.candidate.count({ where: { roleTrack: r.name } })),
    );
    return rows.map((r, i) => ({
      ...r,
      usageCount: counts[i],
      usageLabel: counts[i] === 1 ? 'candidate on this track' : 'candidates on this track',
    }));
  }

  create(input: UpsertRoleTrackInput) {
    return this.prisma.roleTrack.create({ data: { name: input.name } });
  }

  async update(id: string, input: UpsertRoleTrackInput) {
    const existing = await this.prisma.roleTrack.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Role track not found');
    return this.prisma.roleTrack.update({
      where: { id },
      data: { name: input.name, active: input.active },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.roleTrack.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Role track not found');
    const inUse = await this.prisma.candidate.count({ where: { roleTrack: existing.name } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete: ${inUse} candidate${inUse === 1 ? ' is' : 's are'} on this track. Mark it inactive instead.`,
      );
    }
    await this.prisma.roleTrack.delete({ where: { id } });
    return { success: true };
  }
}
