import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SkillsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.skill.findMany({ orderBy: { name: 'asc' } });
    const counts = await Promise.all(rows.map((r) => this.prisma.employeeSkill.count({ where: { skillId: r.id } })));
    return rows.map((r, i) => ({
      ...r,
      usageCount: counts[i],
      usageLabel: counts[i] === 1 ? 'employee has this skill' : 'employees have this skill',
    }));
  }

  create(name: string) {
    return this.prisma.skill.create({ data: { name } });
  }

  async update(id: string, name: string) {
    const existing = await this.prisma.skill.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Skill not found');
    return this.prisma.skill.update({ where: { id }, data: { name } });
  }

  async remove(id: string) {
    const inUse = await this.prisma.employeeSkill.count({ where: { skillId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete: ${inUse} employee${inUse === 1 ? '' : 's'} still have this skill assigned.`,
      );
    }
    const existing = await this.prisma.skill.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Skill not found');
    await this.prisma.skill.delete({ where: { id } });
    return { success: true };
  }
}
