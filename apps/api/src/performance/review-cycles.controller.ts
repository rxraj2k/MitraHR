import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { ReviewCyclesService } from './review-cycles.service';
import { CreateReviewCycleDto } from './dto/create-review-cycle.dto';
import { UpdateReviewCycleDto } from './dto/update-review-cycle.dto';

// Review cycle names/dates are visible to everyone logged in (the Goals
// and My Performance screens need the list for their cycle picker); only
// staff can create/edit/close/delete a cycle.
@UseGuards(JwtAuthGuard)
@Controller('review-cycles')
export class ReviewCyclesController {
  constructor(private service: ReviewCyclesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  create(@Body() dto: CreateReviewCycleDto) {
    return this.service.create(dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReviewCycleDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
