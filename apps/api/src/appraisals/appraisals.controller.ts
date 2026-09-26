import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { AppraisalsService } from './appraisals.service';
import { SubmitAppraisalDto } from './dto/submit-appraisal.dto';
import { FinalizeAppraisalDto, ReviewAppraisalDto } from './dto/review-appraisal.dto';

// Resolves "my own" employee record for both session kinds — a pure OTP
// employee session's `sub` IS the employeeId; a STAFF session only has one
// if that admin is also linked to an Employee record (same helper shape as
// GoalsController's self-vs-on-behalf-of split).
function myEmployeeId(user: any): string | null {
  return user.kind === 'EMPLOYEE' ? user.sub : user.employeeId ?? null;
}

@UseGuards(JwtAuthGuard)
@Controller('appraisals')
export class AppraisalsController {
  constructor(private service: AppraisalsService) {}

  // --- Employee self-service (declared before the staff :id routes so
  // 'mine' matches as a literal segment, not the :id wildcard) ----------

  @Get('mine')
  findMine(@Req() req: any) {
    const employeeId = myEmployeeId(req.user);
    if (!employeeId) return [];
    return this.service.findMine(employeeId);
  }

  @Get('mine/:id')
  findOneMine(@Req() req: any, @Param('id') id: string) {
    const employeeId = myEmployeeId(req.user);
    if (!employeeId) throw new ForbiddenException('No employee record linked to this account');
    return this.service.findOneForEmployee(employeeId, id);
  }

  @Post('mine/:id/submit')
  submit(@Req() req: any, @Param('id') id: string, @Body() dto: SubmitAppraisalDto) {
    const employeeId = myEmployeeId(req.user);
    if (!employeeId) throw new ForbiddenException('No employee record linked to this account');
    return this.service.submit(employeeId, id, dto);
  }

  // --- Admin dashboard ---------------------------------------------------

  // Fires the joining-date cycle check immediately instead of waiting for
  // the 8am cron -- same testing/catch-up rationale as
  // NotificationsController's run-daily-check. Declared before ':id' for
  // the same literal-segment-first reason as 'mine' above.
  @UseGuards(StaffOnlyGuard)
  @Post('run-cycle-check')
  runCycleCheck() {
    return this.service.checkAppraisalCycles();
  }

  @UseGuards(StaffOnlyGuard)
  @Get()
  findAll() {
    return this.service.findAllForAdmin();
  }

  @UseGuards(StaffOnlyGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOneForAdmin(id);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id/review')
  saveReview(@Req() req: any, @Param('id') id: string, @Body() dto: ReviewAppraisalDto) {
    return this.service.saveReview(id, req.user.sub, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Post(':id/finalize')
  finalize(@Req() req: any, @Param('id') id: string, @Body() dto: FinalizeAppraisalDto) {
    return this.service.finalize(id, req.user.sub, dto, req.user);
  }

  // Sends the trigger email for a cycle that the backlog cap (see
  // APPRAISAL_AUTO_EMAIL_WINDOW_DAYS) left un-emailed, or resends a lost one.
  @UseGuards(StaffOnlyGuard)
  @Post(':id/send-reminder')
  sendReminder(@Param('id') id: string) {
    return this.service.sendReminder(id);
  }
}
