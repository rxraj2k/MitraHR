import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.client.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { projects: true } } },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: { projects: { include: { _count: { select: { assignments: true } } }, orderBy: { name: 'asc' } } },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  create(input: any) {
    return this.prisma.client.create({ data: input });
  }

  async update(id: string, input: any) {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Client not found');
    return this.prisma.client.update({ where: { id }, data: input });
  }

  async remove(id: string) {
    const inUse = await this.prisma.project.count({ where: { clientId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete: ${inUse} project${inUse === 1 ? '' : 's'} belong to this client. Mark it inactive instead.`,
      );
    }
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Client not found');
    await this.prisma.client.delete({ where: { id } });
    return { success: true };
  }
}
