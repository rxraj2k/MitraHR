import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

// Every route here is scoped to the caller's own identity (req.user.kind +
// req.user.sub) — there's no "view someone else's notifications" case.
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

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
