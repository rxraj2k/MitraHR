import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { FinalizeReviewDto } from './dto/finalize-review.dto';
import { Requester } from './goals.service';

const REVIEW_INCLUDE = {
  employee: {
    select: {
      id: true,
      fullName: true,
      employeeCode: true,
      photoUrl: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      designation: { select: { id: true, name: true } },
    },
  },
  reviewCycle: true,
  feedback: {
    include: { rater: { select: { id: true, fullName: true, employeeCode: true } } },
    orderBy: { submittedAt: 'asc' as const },
  },
};

@Injectable()
export class PerformanceReviewsService {
  constructor(private prisma: PrismaService) {}

  findAll(params: { employeeId?: string; reviewCycleId?: string }) {
    return this.prisma.performanceReview.findMany({
      where: { employeeId: params.employeeId, reviewCycleId: params.reviewCycleId },
      include: REVIEW_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, requester: Requester) {
    const review = await this.prisma.performanceReview.findUnique({ where: { id }, include: REVIEW_INCLUDE });
    if (!review) throw new NotFoundException('Performance review not found');
    if (requester.kind === 'EMPLOYEE' && review.employeeId !== requester.sub) {
      throw new ForbiddenException('You can only view your own performance review');
    }
    return review;
  }

  async create(dto: CreateReviewDto) {
    const existing = await this.prisma.performanceReview.findUnique({
      where: { reviewCycleId_employeeId: { reviewCycleId: dto.reviewCycleId, employeeId: dto.employeeId } },
    });
    if (existing) throw new BadRequestException('A review already exists for this employee in this cycle');
    return this.prisma.performanceReview.create({
      data: {
        reviewCycleId: dto.reviewCycleId,
        employeeId: dto.employeeId,
        expectedPeerReviewers: dto.expectedPeerReviewers,
      },
      include: REVIEW_INCLUDE,
    });
  }

  // Employees can submit their own SELF feedback; anything else (MANAGER /
  // PEER) requires a staff session, same "self-service for your own stuff,
  // staff for everything else" split as the rest of this module.
  async submitFeedback(id: string, dto: SubmitFeedbackDto, requester: Requester) {
    const review = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Performance review not found');

    let raterId: string;
    if (requester.kind === 'EMPLOYEE') {
      if (dto.raterType !== 'SELF' || review.employeeId !== requester.sub) {
        throw new ForbiddenException('Employees may only submit their own self-review on their own review');
      }
      raterId = requester.sub;
    } else {
      if (!dto.raterId) throw new BadRequestException('raterId is required for a staff-submitted rating');
      raterId = dto.raterId;
    }

    const feedback = await this.prisma.reviewFeedback.upsert({
      where: {
        performanceReviewId_raterId_raterType: {
          performanceReviewId: id,
          raterId,
          raterType: dto.raterType,
        },
      },
      update: {
        communicationRating: dto.communicationRating,
        technicalRating: dto.technicalRating,
        teamworkRating: dto.teamworkRating,
        goalAchievementRating: dto.goalAchievementRating,
        comments: dto.comments,
        submittedAt: new Date(),
      },
      create: {
        performanceReviewId: id,
        raterId,
        raterType: dto.raterType,
        communicationRating: dto.communicationRating,
        technicalRating: dto.technicalRating,
        teamworkRating: dto.teamworkRating,
        goalAchievementRating: dto.goalAchievementRating,
        comments: dto.comments,
      },
    });

    if (review.status === 'NOT_STARTED') {
      await this.prisma.performanceReview.update({ where: { id }, data: { status: 'IN_PROGRESS' } });
    }
    return feedback;
  }

  async finalize(id: string, dto: FinalizeReviewDto) {
    const review = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Performance review not found');
    return this.prisma.performanceReview.update({
      where: { id },
      data: {
        overallRating: dto.overallRating,
        potentialRating: dto.potentialRating,
        managerSummary: dto.managerSummary,
        status: 'COMPLETED',
      },
      include: REVIEW_INCLUDE,
    });
  }

  async acknowledge(id: string, requester: Requester) {
    const review = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Performance review not found');
    const requesterEmployeeId = requester.kind === 'EMPLOYEE' ? requester.sub : requester.employeeId;
    if (!requesterEmployeeId || review.employeeId !== requesterEmployeeId) {
      throw new ForbiddenException('Only the reviewed employee can acknowledge this review');
    }
    if (review.status !== 'COMPLETED') {
      throw new BadRequestException('This review has not been finalized yet');
    }
    return this.prisma.performanceReview.update({
      where: { id },
      data: { employeeAcknowledged: true, acknowledgedAt: new Date() },
      include: REVIEW_INCLUDE,
    });
  }

  // Performance-to-project correlation: rather than a new schema, this
  // cross-references the employee's real ProjectAssignments against the
  // review cycle's date range so a manager can see which client
  // engagements this rating period actually covers.
  async projectContext(id: string, requester: Requester) {
    const review = await this.prisma.performanceReview.findUnique({
      where: { id },
      include: { reviewCycle: true },
    });
    if (!review) throw new NotFoundException('Performance review not found');
    if (requester.kind === 'EMPLOYEE' && review.employeeId !== requester.sub) {
      throw new ForbiddenException('You can only view your own performance review');
    }
    const assignments = await this.prisma.projectAssignment.findMany({
      where: {
        employeeId: review.employeeId,
        startDate: { lte: review.reviewCycle.endDate },
        OR: [{ endDate: null }, { endDate: { gte: review.reviewCycle.startDate } }],
      },
      include: { project: { include: { client: { select: { id: true, name: true } } } } },
      orderBy: { startDate: 'desc' },
    });
    return assignments;
  }

  async remove(id: string) {
    const review = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Performance review not found');
    await this.prisma.performanceReview.delete({ where: { id } });
  }
}
