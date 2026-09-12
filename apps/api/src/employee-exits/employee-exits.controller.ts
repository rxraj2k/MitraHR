import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { EmployeeExitsService } from './employee-exits.service';
import { InitiateExitDto } from './dto/initiate-exit.dto';
import { UpdateClearanceItemDto } from './dto/update-clearance-item.dto';

// Offboarding data is as sensitive as employee records themselves —
// staff-only end to end, no employee-facing read (matches Clients).
@UseGuards(JwtAuthGuard, StaffOnlyGuard)
@Controller('employee-exits')
export class EmployeeExitsController {
  constructor(private service: EmployeeExitsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  initiate(@Body() dto: InitiateExitDto) {
    return this.service.initiate(dto);
  }

  @Patch(':id/items/:itemId')
  updateItem(@Param('id') id: string, @Param('itemId') itemId: string, @Body() dto: UpdateClearanceItemDto) {
    return this.service.updateItem(id, itemId, dto);
  }

  @Post(':id/clear')
  markCleared(@Param('id') id: string) {
    return this.service.markCleared(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
