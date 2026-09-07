import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { LeaveTypesService } from './leave-types.service';

const ACCRUAL_METHODS = ['MONTHLY', 'UPFRONT', 'NONE'];

class UpsertLeaveTypeDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  annualQuota?: number;

  @IsIn(ACCRUAL_METHODS)
  accrualMethod: string;

  @IsBoolean()
  isPaid: boolean;

  @IsBoolean()
  carryForwardAllowed: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// Read open to any logged-in session (employees see quotas on "My Leave").
// All writes are staff-only.
@UseGuards(JwtAuthGuard)
@Controller('leave-types')
export class LeaveTypesController {
  constructor(private leaveTypesService: LeaveTypesService) {}

  @Get()
  findAll() {
    return this.leaveTypesService.findAll();
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  create(@Body() dto: UpsertLeaveTypeDto) {
    return this.leaveTypesService.create(dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertLeaveTypeDto) {
    return this.leaveTypesService.update(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leaveTypesService.remove(id);
  }
}
