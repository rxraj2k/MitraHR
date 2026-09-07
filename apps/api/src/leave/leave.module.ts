import { Module } from '@nestjs/common';
import { LeaveTypesController } from './leave-types.controller';
import { LeaveTypesService } from './leave-types.service';
import { HolidaysController } from './holidays.controller';
import { HolidaysService } from './holidays.service';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';

@Module({
  controllers: [LeaveTypesController, HolidaysController, LeaveRequestsController],
  providers: [LeaveTypesService, HolidaysService, LeaveRequestsService],
})
export class LeaveModule {}
