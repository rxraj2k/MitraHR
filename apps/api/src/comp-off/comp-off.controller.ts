import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { CompOffService } from './comp-off.service';
import { CreateCompOffDto } from './dto/create-comp-off.dto';
import { DecideCompOffDto } from './dto/decide-comp-off.dto';

// Employees log their own extra days worked and view their own history.
// Staff can do the same on behalf of anyone, plus approve/reject.
@UseGuards(JwtAuthGuard)
@Controller('comp-off')
export class CompOffController {
  constructor(private compOffService: CompOffService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateCompOffDto) {
    let employeeId: string;
    if (req.user.kind === 'EMPLOYEE') {
      employeeId = req.user.sub;
    } else {
      if (!dto.employeeId) {
        throw new ForbiddenException('employeeId is required when logging on behalf of an employee');
      }
      employeeId = dto.employeeId;
    }
    return this.compOffService.create(employeeId, dto);
  }

  @Get()
  findAll(@Req() req: any, @Query('employeeId') employeeId?: string, @Query('status') status?: string) {
    if (req.user.kind === 'EMPLOYEE') {
      return this.compOffService.findForEmployee(req.user.sub);
    }
    return this.compOffService.findAll({ employeeId, status });
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id/decide')
  decide(@Req() req: any, @Param('id') id: string, @Body() dto: DecideCompOffDto) {
    return this.compOffService.decide(id, req.user.sub, dto.status, dto.decisionNote);
  }
}
