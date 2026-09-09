import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { UtilizationModule } from '../utilization/utilization.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [AttendanceModule, UtilizationModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
