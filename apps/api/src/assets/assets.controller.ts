import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { AssetsService } from './assets.service';
import { UpsertAssetDto } from './dto/upsert-asset.dto';
import { AssignAssetDto } from './dto/assign-asset.dto';
import { ReturnAssetDto } from './dto/return-asset.dto';
import { SetAssetStatusDto } from './dto/set-asset-status.dto';

// Full asset inventory is staff-only. An employee (OTP session) can only
// reach their own scoped "My Assets" list via GET /assets/my.
@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Get('my')
  myAssets(@Req() req: any, @Query('employeeId') employeeId?: string) {
    const targetId = req.user.kind === 'EMPLOYEE' ? req.user.sub : employeeId || req.user.employeeId;
    if (!targetId) throw new ForbiddenException('employeeId is required');
    return this.assetsService.findForEmployee(targetId);
  }

  @UseGuards(StaffOnlyGuard)
  @Get()
  findAll(@Query('category') category?: string, @Query('status') status?: string) {
    return this.assetsService.findAll({ category, status });
  }

  @UseGuards(StaffOnlyGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  create(@Body() dto: UpsertAssetDto) {
    return this.assetsService.create(dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertAssetDto) {
    return this.assetsService.update(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignAssetDto) {
    return this.assetsService.assign(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id/return')
  returnAsset(@Param('id') id: string, @Body() dto: ReturnAssetDto) {
    return this.assetsService.return(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: SetAssetStatusDto) {
    return this.assetsService.setStatus(id, dto.status);
  }
}
