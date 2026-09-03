import { Module } from '@nestjs/common';
import { DesignationsController } from './designations.controller';
import { DesignationsService } from './designations.service';

@Module({
  controllers: [DesignationsController],
  providers: [DesignationsService],
})
export class DesignationsModule {}
