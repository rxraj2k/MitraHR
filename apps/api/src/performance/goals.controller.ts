import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { CreateKeyResultDto } from './dto/create-key-result.dto';
import { UpdateKeyResultDto } from './dto/update-key-result.dto';

// Employees (OTP sessions) manage their own goals & check-ins; staff can do
// the same for anyone — same self-vs-on-behalf-of split as
// LeaveRequestsController, since goal-setting is meant to be self-service
// day to day, not gated behind an admin.
@UseGuards(JwtAuthGuard)
@Controller()
export class GoalsController {
  constructor(private service: GoalsService) {}

  @Get('goals')
  findAll(
    @Req() req: any,
    @Query('employeeId') employeeId?: string,
    @Query('reviewCycleId') reviewCycleId?: string,
    @Query('status') status?: string,
  ) {
    const targetEmployeeId = req.user.kind === 'EMPLOYEE' ? req.user.sub : employeeId;
    return this.service.findAll({ employeeId: targetEmployeeId, reviewCycleId, status });
  }

  @Get('goals/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('goals')
  create(@Req() req: any, @Body() dto: CreateGoalDto) {
    let employeeId: string;
    if (req.user.kind === 'EMPLOYEE') {
      employeeId = req.user.sub;
    } else {
      if (!dto.employeeId) {
        throw new ForbiddenException('employeeId is required when creating a goal on behalf of an employee');
      }
      employeeId = dto.employeeId;
    }
    return this.service.create(employeeId, dto);
  }

  @Patch('goals/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.service.update(id, dto, req.user);
  }

  @Delete('goals/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(id, req.user);
  }

  @Get('check-ins')
  findCheckIns(@Req() req: any, @Query('employeeId') employeeId?: string, @Query('goalId') goalId?: string) {
    const targetEmployeeId = req.user.kind === 'EMPLOYEE' ? req.user.sub : employeeId;
    return this.service.findCheckIns({ employeeId: targetEmployeeId, goalId });
  }

  @Post('check-ins')
  createCheckIn(@Req() req: any, @Body() dto: CreateCheckInDto) {
    let employeeId: string;
    if (req.user.kind === 'EMPLOYEE') {
      employeeId = req.user.sub;
    } else {
      if (!dto.employeeId) {
        throw new ForbiddenException('employeeId is required when logging a check-in on behalf of an employee');
      }
      employeeId = dto.employeeId;
    }
    return this.service.createCheckIn(employeeId, dto);
  }

  @Delete('check-ins/:id')
  removeCheckIn(@Req() req: any, @Param('id') id: string) {
    return this.service.removeCheckIn(id, req.user);
  }

  @Post('goals/:goalId/key-results')
  createKeyResult(@Req() req: any, @Param('goalId') goalId: string, @Body() dto: CreateKeyResultDto) {
    return this.service.createKeyResult(goalId, dto, req.user);
  }

  @Patch('key-results/:id')
  updateKeyResult(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateKeyResultDto) {
    return this.service.updateKeyResult(id, dto, req.user);
  }

  @Delete('key-results/:id')
  removeKeyResult(@Req() req: any, @Param('id') id: string) {
    return this.service.removeKeyResult(id, req.user);
  }
}
