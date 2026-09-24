import { Module } from '@nestjs/common';
import { LearningResourcesController } from './learning-resources.controller';
import { LearningResourcesService } from './learning-resources.service';

@Module({
  controllers: [LearningResourcesController],
  providers: [LearningResourcesService],
})
export class LearningResourcesModule {}
