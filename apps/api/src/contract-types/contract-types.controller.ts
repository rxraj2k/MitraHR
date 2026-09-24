import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { ContractTypesService } from './contract-types.service';

class UpsertContractTypeDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller('contract-types')
export class ContractTypesController {
  constructor(private contractTypesService: ContractTypesService) {}

  @Get()
  findAll() {
    return this.contractTypesService.findAll();
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  create(@Body() dto: UpsertContractTypeDto) {
    return this.contractTypesService.create(dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertContractTypeDto) {
    return this.contractTypesService.update(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contractTypesService.remove(id);
  }
}
