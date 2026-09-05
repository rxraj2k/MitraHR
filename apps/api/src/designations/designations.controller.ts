import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { DesignationsService } from './designations.service';

class UpsertDesignationDto {
  @IsString()
  @MinLength(1)
  name: string;
}

@UseGuards(JwtAuthGuard)
@Controller('designations')
export class DesignationsController {
  constructor(private designationsService: DesignationsService) {}

  @Get()
  findAll() {
    return this.designationsService.findAll();
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  create(@Body() dto: UpsertDesignationDto) {
    return this.designationsService.create(dto.name);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertDesignationDto) {
    return this.designationsService.update(id, dto.name);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.designationsService.remove(id);
  }
}
