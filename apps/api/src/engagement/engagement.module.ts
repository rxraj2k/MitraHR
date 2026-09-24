import { Module } from '@nestjs/common';
import { RecognitionController } from './recognition.controller';
import { RecognitionService } from './recognition.service';
import { PulseSurveysController } from './pulse-surveys.controller';
import { PulseSurveysService } from './pulse-surveys.service';

@Module({
  controllers: [RecognitionController, PulseSurveysController],
  providers: [RecognitionService, PulseSurveysService],
})
export class EngagementModule {}
