import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { AssetCategoriesService } from './asset-categories.service';

class UpsertAssetCategoryDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsIn(['HARDWARE', 'SOFTWARE'])
  kind?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller('asset-categories')
export class AssetCategoriesController {
  constructor(private assetCategoriesService: AssetCategoriesService) {}

  @Get()
  findAll() {
    return this.assetCategoriesService.findAll();
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  create(@Body() dto: UpsertAssetCategoryDto) {
    return this.assetCategoriesService.create(dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertAssetCategoryDto) {
    return this.assetCategoriesService.update(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assetCategoriesService.remove(id);
  }
}
