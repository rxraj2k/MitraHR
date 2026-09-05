import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkillsService } from './skills.service';

class UpsertSkillDto {
  @IsString()
  @MinLength(1)
  name: string;
}

@UseGuards(JwtAuthGuard)
@Controller('skills')
export class SkillsController {
  constructor(private skillsService: SkillsService) {}

  @Get()
  findAll() {
    return this.skillsService.findAll();
  }

  @Post()
  create(@Body() dto: UpsertSkillDto) {
    return this.skillsService.create(dto.name);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertSkillDto) {
    return this.skillsService.update(id, dto.name);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.skillsService.remove(id);
  }
}
