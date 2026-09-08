import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { UtilizationService } from './utilization.service';

// Staff-only: shows every active employee's current project allocation, so
// it's business-sensitive the same way the full Projects/Clients views are.
@UseGuards(JwtAuthGuard, StaffOnlyGuard)
@Controller('utilization')
export class UtilizationController {
  constructor(private utilizationService: UtilizationService) {}

  @Get()
  findAll() {
    return this.utilizationService.findAll();
  }
}
