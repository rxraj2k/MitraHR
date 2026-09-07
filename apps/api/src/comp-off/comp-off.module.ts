import { Module } from '@nestjs/common';
import { CompOffController } from './comp-off.controller';
import { CompOffService } from './comp-off.service';

@Module({
  controllers: [CompOffController],
  providers: [CompOffService],
})
export class CompOffModule {}
