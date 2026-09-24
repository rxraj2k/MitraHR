import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewCycleDto } from './dto/create-review-cycle.dto';
import { UpdateReviewCycleDto } from './dto/update-review-cycle.dto';

@Injectable()
export class ReviewCyclesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.reviewCycle.findMany({
      orderBy: { startDate: 'desc' },
      include: { _count: { select: { goals: true, reviews: true } } },
    });
  }

  async findOne(id: string) {
    const cycle = await this.prisma.reviewCycle.findUnique({
      where: { id },
      include: { _count: { select: { goals: true, reviews: true } } },
    });
    if (!cycle) throw new NotFoundException('Review cycle not found');
    return cycle;
  }

  create(dto: CreateReviewCycleDto) {
    return this.prisma.reviewCycle.create({
      data: { name: dto.name, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate) },
    });
  }

  async update(id: string, dto: UpdateReviewCycleDto) {
    await this.findOne(id);
    return this.prisma.reviewCycle.update({
      where: { id },
      data: {
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: dto.status,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.reviewCycle.delete({ where: { id } });
  }
}
