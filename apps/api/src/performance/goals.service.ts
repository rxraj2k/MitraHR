import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { CreateKeyResultDto } from './dto/create-key-result.dto';
import { UpdateKeyResultDto } from './dto/update-key-result.dto';

export interface Requester {
  kind: 'STAFF' | 'EMPLOYEE';
  sub: string;
  // Set for STAFF sessions whose User is linked to an Employee record —
  // lets e.g. an Admin who is also staff on the org chart acknowledge
  // their own performance review while logged in with their password.
  employeeId?: string | null;
}

const GOAL_INCLUDE = {
  employee: { select: { id: true, fullName: true, employeeCode: true, photoUrl: true } },
  reviewCycle: { select: { id: true, name: true, status: true } },
  parentGoal: { select: { id: true, title: true, category: true } },
  project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
  keyResults: { orderBy: { order: 'asc' as const } },
  _count: { select: { checkIns: true, childGoals: true } },
};

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  findAll(params: { employeeId?: string; reviewCycleId?: string; status?: string }) {
    return this.prisma.goal.findMany({
      where: {
        employeeId: params.employeeId,
        reviewCycleId: params.reviewCycleId,
        status: params.status,
      },
      include: GOAL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
      include: { ...GOAL_INCLUDE, checkIns: { orderBy: { checkInDate: 'desc' } } },
    });
    if (!goal) throw new NotFoundException('Goal not found');
    return goal;
  }

  create(employeeId: string, dto: CreateGoalDto) {
    return this.prisma.goal.create({
      data: {
        employeeId,
        reviewCycleId: dto.reviewCycleId,
        parentGoalId: dto.parentGoalId,
        projectId: dto.projectId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        progress: dto.progress,
        status: dto.status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: GOAL_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateGoalDto, requester: Requester) {
    const goal = await this.findOne(id);
    if (requester.kind === 'EMPLOYEE' && goal.employeeId !== requester.sub) {
      throw new ForbiddenException("You can only update your own goals");
    }
    return this.prisma.goal.update({
      where: { id },
      data: {
        reviewCycleId: dto.reviewCycleId,
        parentGoalId: dto.parentGoalId,
        projectId: dto.projectId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        progress: dto.progress,
        status: dto.status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: GOAL_INCLUDE,
    });
  }

  async remove(id: string, requester: Requester) {
    const goal = await this.findOne(id);
    if (requester.kind === 'EMPLOYEE' && goal.employeeId !== requester.sub) {
      throw new ForbiddenException('You can only delete your own goals');
    }
    await this.prisma.goal.delete({ where: { id } });
  }

  // --- Check-ins ----------------------------------------------------------
  // Continuous, lightweight progress logs — optionally against a goal, but
  // not required to be (a general "here's what I did this week" note is
  // still useful without forcing it onto a specific OKR).

  findCheckIns(params: { employeeId?: string; goalId?: string }) {
    return this.prisma.checkIn.findMany({
      where: { employeeId: params.employeeId, goalId: params.goalId },
      orderBy: { checkInDate: 'desc' },
    });
  }

  async createCheckIn(employeeId: string, dto: CreateCheckInDto) {
    if (dto.goalId) {
      const goal = await this.prisma.goal.findUnique({ where: { id: dto.goalId } });
      if (!goal) throw new NotFoundException('Goal not found');
    }
    return this.prisma.checkIn.create({
      data: {
        employeeId,
        goalId: dto.goalId,
        progressUpdate: dto.progressUpdate,
        blockers: dto.blockers,
        confidence: dto.confidence,
      },
    });
  }

  async removeCheckIn(id: string, requester: Requester) {
    const checkIn = await this.prisma.checkIn.findUnique({ where: { id } });
    if (!checkIn) throw new NotFoundException('Check-in not found');
    if (requester.kind === 'EMPLOYEE' && checkIn.employeeId !== requester.sub) {
      throw new ForbiddenException('You can only delete your own check-ins');
    }
    await this.prisma.checkIn.delete({ where: { id } });
  }

  // --- Key Results ---------------------------------------------------------
  // Nested, checkbox-style sub-tasks under a Goal (e.g. "0/3 Key Results
  // Done") — ownership always follows the parent goal's employee.

  private async assertGoalOwnership(goalId: string, requester: Requester) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundException('Goal not found');
    if (requester.kind === 'EMPLOYEE' && goal.employeeId !== requester.sub) {
      throw new ForbiddenException('You can only manage key results on your own goals');
    }
    return goal;
  }

  async createKeyResult(goalId: string, dto: CreateKeyResultDto, requester: Requester) {
    await this.assertGoalOwnership(goalId, requester);
    return this.prisma.keyResult.create({
      data: { goalId, title: dto.title, targetValue: dto.targetValue, order: dto.order ?? 0 },
    });
  }

  async updateKeyResult(id: string, dto: UpdateKeyResultDto, requester: Requester) {
    const keyResult = await this.prisma.keyResult.findUnique({ where: { id } });
    if (!keyResult) throw new NotFoundException('Key result not found');
    await this.assertGoalOwnership(keyResult.goalId, requester);
    return this.prisma.keyResult.update({
      where: { id },
      data: { title: dto.title, targetValue: dto.targetValue, completed: dto.completed, order: dto.order },
    });
  }

  async removeKeyResult(id: string, requester: Requester) {
    const keyResult = await this.prisma.keyResult.findUnique({ where: { id } });
    if (!keyResult) throw new NotFoundException('Key result not found');
    await this.assertGoalOwnership(keyResult.goalId, requester);
    await this.prisma.keyResult.delete({ where: { id } });
  }
}
