import { Module } from '@nestjs/common';
import { ReviewCyclesController } from './review-cycles.controller';
import { ReviewCyclesService } from './review-cycles.service';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { PerformanceReviewsController } from './performance-reviews.controller';
import { PerformanceReviewsService } from './performance-reviews.service';

@Module({
  controllers: [ReviewCyclesController, GoalsController, PerformanceReviewsController],
  providers: [ReviewCyclesService, GoalsService, PerformanceReviewsService],
})
export class PerformanceModule {}
