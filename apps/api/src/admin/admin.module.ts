import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

// PrismaModule is @Global(), so no explicit import is needed here (same
// pattern as AppraisalsModule).
@Module({
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
