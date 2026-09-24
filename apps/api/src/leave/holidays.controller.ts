import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { HolidaysService } from './holidays.service';

const REGIONS = ['US', 'INDIA', 'COMPANY'];
const HOLIDAY_TYPES = ['NATIONAL', 'REGIONAL', 'FLOATING'];

class UpsertHolidayDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsDateString()
  date: string;

  @IsIn(REGIONS)
  region: string;

  @IsOptional()
  @IsIn(HOLIDAY_TYPES)
  type?: string;
}

// Read open to any logged-in session (everyone should see the holiday
// calendar). All writes are staff-only. region is informational only —
// every row here counts as a non-working day for leave-day math regardless
// of which calendar (US / India / company) it belongs to.
@UseGuards(JwtAuthGuard)
@Controller('holidays')
export class HolidaysController {
  constructor(private holidaysService: HolidaysService) {}

  @Get()
  findAll() {
    return this.holidaysService.findAll();
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  create(@Body() dto: UpsertHolidayDto) {
    return this.holidaysService.create(dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertHolidayDto) {
    return this.holidaysService.update(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.holidaysService.remove(id);
  }
}
