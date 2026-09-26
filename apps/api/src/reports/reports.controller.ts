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
  dashboardSummary(@Query('range') range?: 'month' | 'quarter' | 'year') {
    return this.reportsService.dashboardSummary(range);
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

  // --- Reports & Analytics preview (/reports-preview) ---

  @Get('preview/overview')
  previewOverview() {
    return this.reportsService.previewOverview();
  }

  @Get('preview/attendance-trend')
  previewAttendanceTrend(@Query('months') months?: string) {
    return this.reportsService.previewAttendanceTrend(months ? parseInt(months, 10) : undefined);
  }

  @Get('preview/tenure-spread')
  previewTenureSpread() {
    return this.reportsService.previewTenureSpread();
  }

  @Get('preview/attendance-ledger')
  previewAttendanceLedger() {
    return this.reportsService.previewAttendanceLedger();
  }

  @Get('preview/tenure-mobility')
  previewTenureMobility() {
    return this.reportsService.previewTenureMobility();
  }

  @Get('preview/attrition-risk')
  previewAttritionRisk() {
    return this.reportsService.previewAttritionRisk();
  }

  @Get('preview/compliance-radar')
  previewComplianceRadar() {
    return this.reportsService.previewComplianceRadar();
  }

  @Get('preview/compliance-roster')
  previewComplianceRoster() {
    return this.reportsService.previewComplianceRoster();
  }

  @Get('preview/us-client-alignment')
  previewUsClientAlignment() {
    return this.reportsService.previewUsClientAlignment();
  }

  @Get('preview/attendance-timeliness')
  previewAttendanceTimeliness() {
    return this.reportsService.previewAttendanceTimeliness();
  }

  @Get('preview/turnover')
  previewTurnover() {
    return this.reportsService.previewTurnover();
  }

  @Get('preview/recruitment-speed')
  previewRecruitmentSpeed() {
    return this.reportsService.previewRecruitmentSpeed();
  }

  @Get('preview/recruitment-funnel')
  previewRecruitmentFunnel() {
    return this.reportsService.previewRecruitmentFunnel();
  }

  @Get('preview/performance-engagement')
  previewPerformanceEngagement() {
    return this.reportsService.previewPerformanceEngagement();
  }

  // --- Reports audit additions: Leave Utilization, Hours & Overtime,
  // Office Wall Engagement, Appraisal Cycle Status, Asset Inventory ---

  @Get('preview/leave-utilization')
  previewLeaveUtilization() {
    return this.reportsService.previewLeaveUtilization();
  }

  @Get('preview/hours-overtime')
  previewHoursOvertime() {
    return this.reportsService.previewHoursOvertime();
  }

  @Get('preview/office-wall-engagement')
  previewOfficeWallEngagement() {
    return this.reportsService.previewOfficeWallEngagement();
  }

  @Get('preview/appraisal-cycle-status')
  previewAppraisalCycleStatus() {
    return this.reportsService.previewAppraisalCycleStatus();
  }

  @Get('preview/asset-inventory')
  previewAssetInventory() {
    return this.reportsService.previewAssetInventory();
  }
}
