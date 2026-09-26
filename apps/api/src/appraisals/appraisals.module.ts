import { Module } from '@nestjs/common';
import { AppraisalsController } from './appraisals.controller';
import { AppraisalsService } from './appraisals.service';
import { AppraisalCriteriaController } from './appraisal-criteria.controller';
import { AppraisalCriteriaService } from './appraisal-criteria.service';

@Module({
  controllers: [AppraisalsController, AppraisalCriteriaController],
  providers: [AppraisalsService, AppraisalCriteriaService],
})
export class AppraisalsModule {}
