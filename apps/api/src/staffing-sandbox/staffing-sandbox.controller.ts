import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { StaffingSandboxService } from './staffing-sandbox.service';
import { PlaceEmployeeDto } from './dto/place-employee.dto';

// Staff-only: shows every active employee and every open project side by
// side, same sensitivity level as Bench & Utilization.
@UseGuards(JwtAuthGuard, StaffOnlyGuard)
@Controller('staffing-sandbox')
export class StaffingSandboxController {
  constructor(private sandboxService: StaffingSandboxService) {}

  @Get('board')
  getBoard() {
    return this.sandboxService.getBoard();
  }

  @Patch('place')
  place(@Body() dto: PlaceEmployeeDto) {
    return this.sandboxService.place(dto.employeeId, dto.projectId ?? null);
  }

  @Post('reset')
  reset() {
    return this.sandboxService.reset();
  }

  // Preview of what "Apply & Save Plan" would do — never mutates anything.
  @Get('plan')
  getPlan() {
    return this.sandboxService.getPlan();
  }

  // Commits the plan above into real ProjectAssignment rows.
  @Post('apply')
  apply() {
    return this.sandboxService.applyPlan();
  }
}
