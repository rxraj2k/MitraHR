import { Module } from '@nestjs/common';
import { OfficeWallController } from './office-wall.controller';
import { OfficeWallService } from './office-wall.service';

@Module({
  controllers: [OfficeWallController],
  providers: [OfficeWallService],
})
export class OfficeWallModule {}
