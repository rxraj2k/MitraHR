import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { CandidateSourcesService } from './candidate-sources.service';

class UpsertCandidateSourceDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller('candidate-sources')
export class CandidateSourcesController {
  constructor(private candidateSourcesService: CandidateSourcesService) {}

  @Get()
  findAll() {
    return this.candidateSourcesService.findAll();
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  create(@Body() dto: UpsertCandidateSourceDto) {
    return this.candidateSourcesService.create(dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertCandidateSourceDto) {
    return this.candidateSourcesService.update(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.candidateSourcesService.remove(id);
  }
}
