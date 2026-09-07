import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { DecideLeaveRequestDto } from './dto/decide-leave-request.dto';

// Employees (OTP sessions) can submit/cancel/view their own requests and
// balances. Staff can do the same for anyone, plus approve/reject. The
// team calendar is open to any logged-in session.
@UseGuards(JwtAuthGuard)
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private leaveRequestsService: LeaveRequestsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateLeaveRequestDto) {
    let employeeId: string;
    if (req.user.kind === 'EMPLOYEE') {
      employeeId = req.user.sub;
    } else {
      if (!dto.employeeId) {
        throw new ForbiddenException('employeeId is required when submitting on behalf of an employee');
      }
      employeeId = dto.employeeId;
    }
    return this.leaveRequestsService.create(employeeId, dto);
  }

  @Get('balances')
  balances(@Req() req: any, @Query('employeeId') employeeId?: string) {
    const targetId = req.user.kind === 'EMPLOYEE' ? req.user.sub : employeeId;
    if (!targetId) throw new ForbiddenException('employeeId is required');
    return this.leaveRequestsService.balancesForEmployee(targetId);
  }

  @Get('calendar')
  calendar(@Query('year') year?: string, @Query('month') month?: string) {
    const now = new Date();
    const y = year ? parseInt(year, 10) : now.getUTCFullYear();
    const m = month ? parseInt(month, 10) : now.getUTCMonth() + 1;
    return this.leaveRequestsService.calendar(y, m);
  }

  @Get()
  findAll(@Req() req: any, @Query('employeeId') employeeId?: string, @Query('status') status?: string) {
    if (req.user.kind === 'EMPLOYEE') {
      return this.leaveRequestsService.findForEmployee(req.user.sub);
    }
    return this.leaveRequestsService.findAll({ employeeId, status });
  }

  @Patch(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.leaveRequestsService.cancel(id, req.user);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id/decide')
  decide(@Req() req: any, @Param('id') id: string, @Body() dto: DecideLeaveRequestDto) {
    return this.leaveRequestsService.decide(id, req.user.sub, dto.status, dto.decisionNote);
  }
}
