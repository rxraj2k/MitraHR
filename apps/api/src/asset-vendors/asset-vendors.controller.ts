import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { AssetVendorsService } from './asset-vendors.service';

class UpsertAssetVendorDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller('asset-vendors')
export class AssetVendorsController {
  constructor(private assetVendorsService: AssetVendorsService) {}

  @Get()
  findAll() {
    return this.assetVendorsService.findAll();
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  create(@Body() dto: UpsertAssetVendorDto) {
    return this.assetVendorsService.create(dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertAssetVendorDto) {
    return this.assetVendorsService.update(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assetVendorsService.remove(id);
  }
}
