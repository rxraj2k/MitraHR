import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { DocumentTypesService } from './document-types.service';

class UpsertDocumentTypeDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsIn(['EMPLOYEE', 'COMPANY'])
  appliesTo: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller('document-types')
export class DocumentTypesController {
  constructor(private documentTypesService: DocumentTypesService) {}

  @Get()
  findAll(@Query('appliesTo') appliesTo?: string) {
    return this.documentTypesService.findAll(appliesTo);
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  create(@Body() dto: UpsertDocumentTypeDto) {
    return this.documentTypesService.create(dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertDocumentTypeDto) {
    return this.documentTypesService.update(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documentTypesService.remove(id);
  }
}
