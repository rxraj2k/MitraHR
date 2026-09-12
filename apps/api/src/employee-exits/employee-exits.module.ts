import { Module } from '@nestjs/common';
import { EmployeeExitsController } from './employee-exits.controller';
import { EmployeeExitsService } from './employee-exits.service';

@Module({
  controllers: [EmployeeExitsController],
  providers: [EmployeeExitsService],
})
export class EmployeeExitsModule {}
