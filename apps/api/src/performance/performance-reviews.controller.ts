import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { PerformanceReviewsService } from './performance-reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { FinalizeReviewDto } from './dto/finalize-review.dto';

// Initiating, finalizing, and deleting a review are staff-only actions
// (mirrors ExitClearance / Recruitment); viewing your own review and
// submitting your own self-review are self-service, same split used
// throughout GoalsController.
@UseGuards(JwtAuthGuard)
@Controller('performance-reviews')
export class PerformanceReviewsController {
  constructor(private service: PerformanceReviewsService) {}

  @Get()
  findAll(@Req() req: any, @Query('employeeId') employeeId?: string, @Query('reviewCycleId') reviewCycleId?: string) {
    const targetEmployeeId = req.user.kind === 'EMPLOYEE' ? req.user.sub : employeeId;
    return this.service.findAll({ employeeId: targetEmployeeId, reviewCycleId });
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(id, req.user);
  }

  @Get(':id/project-context')
  projectContext(@Req() req: any, @Param('id') id: string) {
    return this.service.projectContext(id, req.user);
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  create(@Body() dto: CreateReviewDto) {
    return this.service.create(dto);
  }

  @Post(':id/feedback')
  submitFeedback(@Req() req: any, @Param('id') id: string, @Body() dto: SubmitFeedbackDto) {
    return this.service.submitFeedback(id, dto, req.user);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id/finalize')
  finalize(@Param('id') id: string, @Body() dto: FinalizeReviewDto) {
    return this.service.finalize(id, dto);
  }

  @Patch(':id/acknowledge')
  acknowledge(@Req() req: any, @Param('id') id: string) {
    return this.service.acknowledge(id, req.user);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
