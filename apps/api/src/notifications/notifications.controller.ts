import { Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { NotificationsService } from './notifications.service';
import { DailyJobsService } from './daily-jobs.service';

// Every route here is scoped to the caller's own identity (req.user.kind +
// req.user.sub) — there's no "view someone else's notifications" case —
// except run-daily-check, which is a staff-only ops action.
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private dailyJobsService: DailyJobsService,
  ) {}

  // Runs the birthday + document-expiry check immediately instead of
  // waiting for the 8am cron — useful for testing (a birthday set for
  // today won't show up in the bell until this or the cron runs) and for
  // catching up if the server was down at 8am.
  @UseGuards(StaffOnlyGuard)
  @Post('run-daily-check')
  async runDailyCheck() {
    await this.dailyJobsService.runDailyChecks();
    return { success: true };
  }

  @Get()
  findMine(@Req() req: any) {
    return this.notificationsService.findForUser(req.user.kind, req.user.sub);
  }

  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    const count = await this.notificationsService.unreadCount(req.user.kind, req.user.sub);
    return { count };
  }

  @Patch('read-all')
  markAllRead(@Req() req: any) {
    return this.notificationsService.markAllRead(req.user.kind, req.user.sub);
  }

  @Patch(':id/read')
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.markRead(id, req.user);
  }
}
