import { Module } from '@nestjs/common';
import { UtilizationController } from './utilization.controller';
import { UtilizationService } from './utilization.service';

@Module({
  controllers: [UtilizationController],
  providers: [UtilizationService],
  exports: [UtilizationService],
})
export class UtilizationModule {}
