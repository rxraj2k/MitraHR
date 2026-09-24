import { Module } from '@nestjs/common';
import { StaffingSandboxController } from './staffing-sandbox.controller';
import { StaffingSandboxService } from './staffing-sandbox.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [ProjectsModule],
  controllers: [StaffingSandboxController],
  providers: [StaffingSandboxService],
})
export class StaffingSandboxModule {}
