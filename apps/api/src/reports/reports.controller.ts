import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { ReportsService } from './reports.service';
import { UpdateAttendanceSettingsDto } from './dto/update-attendance-settings.dto';

// Staff-only throughout: everything here is company-wide analytics
// (headcount, leave totals, who's late/absent) — the same sensitivity
// level as Utilization and the full Projects/Clients views.
@UseGuards(JwtAuthGuard, StaffOnlyGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard-summary')
  dashboardSummary() {
    return this.reportsService.dashboardSummary();
  }

  @Get('absenteeism')
  absenteeism(@Query('year') year?: string, @Query('month') month?: string) {
    const now = new Date();
    const y = year ? parseInt(year, 10) : now.getUTCFullYear();
    const m = month ? parseInt(month, 10) : now.getUTCMonth() + 1;
    return this.reportsService.absenteeism(y, m);
  }

  @Get('attendance-analytics')
  attendanceAnalytics(@Query('year') year?: string, @Query('month') month?: string) {
    const now = new Date();
    const y = year ? parseInt(year, 10) : now.getUTCFullYear();
    const m = month ? parseInt(month, 10) : now.getUTCMonth() + 1;
    return this.reportsService.attendanceAnalytics(y, m);
  }

  @Get('project-closures')
  projectClosures() {
    return this.reportsService.projectClosures();
  }

  @Get('attendance-settings')
  getAttendanceSettings() {
    return this.reportsService.getAttendanceSettings();
  }

  @Patch('attendance-settings')
  updateAttendanceSettings(@Body() dto: UpdateAttendanceSettingsDto) {
    return this.reportsService.updateAttendanceSettings(dto);
  }
}
