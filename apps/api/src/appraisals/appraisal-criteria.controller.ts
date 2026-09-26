import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { AppraisalCriteriaService } from './appraisal-criteria.service';
import { UpsertCriterionDto } from './dto/upsert-criterion.dto';

// Master-data scorecard config (Settings > Master Data > Appraisal
// Criteria). Read is open to any authenticated session — an employee
// filling out the self-appraisal form needs to see the criteria and
// weights too — writes are staff-only, same split as SkillsController.
@UseGuards(JwtAuthGuard)
@Controller('appraisal-criteria')
export class AppraisalCriteriaController {
  constructor(private service: AppraisalCriteriaService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  create(@Body() dto: UpsertCriterionDto) {
    return this.service.create(dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertCriterionDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
