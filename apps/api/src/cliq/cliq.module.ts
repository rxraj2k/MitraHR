import { Global, Module } from '@nestjs/common';
import { CliqService } from './cliq.service';

@Global()
@Module({
  providers: [CliqService],
  exports: [CliqService],
})
export class CliqModule {}
