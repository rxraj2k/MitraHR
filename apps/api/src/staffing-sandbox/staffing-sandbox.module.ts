import { Module } from '@nestjs/common';
import { StaffingSandboxController } from './staffing-sandbox.controller';
import { StaffingSandboxService } from './staffing-sandbox.service';

@Module({
  controllers: [StaffingSandboxController],
  providers: [StaffingSandboxService],
})
export class StaffingSandboxModule {}
