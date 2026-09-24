import { Module } from '@nestjs/common';
import { WorkLocationsController } from './work-locations.controller';
import { WorkLocationsService } from './work-locations.service';

@Module({
  controllers: [WorkLocationsController],
  providers: [WorkLocationsService],
})
export class WorkLocationsModule {}
