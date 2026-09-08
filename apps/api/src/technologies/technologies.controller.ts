import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { TechnologiesService } from './technologies.service';

export const PROJECT_CATEGORIES = ['DEVOPS', 'IAM', 'ACTIVE_DIRECTORY', 'CLOUD_SECURITY', 'CYBER_SECURITY'];

class UpsertTechnologyDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsIn(PROJECT_CATEGORIES)
  category: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// Read open to any logged-in session (the Project form needs this list).
// Writes are staff-only, same as the other managed lookups.
@UseGuards(JwtAuthGuard)
@Controller('technologies')
export class TechnologiesController {
  constructor(private technologiesService: TechnologiesService) {}

  @Get()
  findAll(@Query('category') category?: string) {
    return this.technologiesService.findAll(category);
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  create(@Body() dto: UpsertTechnologyDto) {
    return this.technologiesService.create(dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertTechnologyDto) {
    return this.technologiesService.update(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.technologiesService.remove(id);
  }
}
