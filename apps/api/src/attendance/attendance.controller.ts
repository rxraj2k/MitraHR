import { Body, Controller, ForbiddenException, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './check-in.dto';

// Any logged-in session can check themselves in and read the company
// calendar (same openness as the team leave calendar / org chart). Staff
// additionally get to mark/correct attendance on behalf of any employee.
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Post('check-in')
  checkIn(@Req() req: any, @Body() dto: CheckInDto) {
    if (req.user.kind === 'EMPLOYEE') {
      return this.attendanceService.checkIn(req.user.sub, new Date(), 'SELF');
    }
    if (dto.employeeId) {
      return this.attendanceService.checkIn(dto.employeeId, dto.date ? new Date(dto.date) : new Date(), req.user.sub);
    }
    if (req.user.employeeId) {
      return this.attendanceService.checkIn(req.user.employeeId, new Date(), 'SELF');
    }
    throw new ForbiddenException('employeeId is required');
  }

  @Post('check-out')
  checkOut(@Req() req: any, @Body() dto: CheckInDto) {
    if (req.user.kind === 'EMPLOYEE') {
      return this.attendanceService.checkOut(req.user.sub, new Date());
    }
    if (dto.employeeId) {
      return this.attendanceService.checkOut(dto.employeeId, dto.date ? new Date(dto.date) : new Date());
    }
    if (req.user.employeeId) {
      return this.attendanceService.checkOut(req.user.employeeId, new Date());
    }
    throw new ForbiddenException('employeeId is required');
  }

  @Get('today')
  today(@Req() req: any) {
    const employeeId = req.user.kind === 'EMPLOYEE' ? req.user.sub : req.user.employeeId;
    if (!employeeId) throw new ForbiddenException('This account is not linked to an Employee record');
    return this.attendanceService.today(employeeId);
  }

  @Get('calendar')
  calendar(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    const now = new Date();
    const y = year ? parseInt(year, 10) : now.getUTCFullYear();
    const m = month ? parseInt(month, 10) : now.getUTCMonth() + 1;
    return this.attendanceService.calendar(y, m, employeeId);
  }
}
