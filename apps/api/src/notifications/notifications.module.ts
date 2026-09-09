import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { DailyJobsService } from './daily-jobs.service';

// Global, like MailModule and PrismaModule — every feature module that
// creates notifications (leave, comp-off, training, projects, assets)
// injects NotificationsService directly without importing this module.
@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, DailyJobsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
