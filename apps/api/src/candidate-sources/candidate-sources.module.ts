import { Module } from '@nestjs/common';
import { CandidateSourcesController } from './candidate-sources.controller';
import { CandidateSourcesService } from './candidate-sources.service';

@Module({
  controllers: [CandidateSourcesController],
  providers: [CandidateSourcesService],
})
export class CandidateSourcesModule {}
