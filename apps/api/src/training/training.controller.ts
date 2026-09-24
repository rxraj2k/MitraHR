import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { TrainingService } from './training.service';
import { UpsertCourseDto } from './dto/upsert-course.dto';
import { AssignTrainingDto } from './dto/assign-training.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';

// The course catalog and team-wide progress are staff-only (same
// sensitivity as Projects/Clients); an employee (OTP session) can only
// reach their own assignments via /training/my and update their own
// assignment's status.
@UseGuards(JwtAuthGuard)
@Controller('training')
export class TrainingController {
  constructor(private trainingService: TrainingService) {}

  @Get('my')
  myTraining(@Req() req: any, @Query('employeeId') employeeId?: string) {
    const targetId = req.user.kind === 'EMPLOYEE' ? req.user.sub : employeeId || req.user.employeeId;
    if (!targetId) throw new ForbiddenException('employeeId is required');
    return this.trainingService.findForEmployee(targetId);
  }

  @UseGuards(StaffOnlyGuard)
  @Get('courses')
  findAllCourses(@Query('includeInactive') includeInactive?: string) {
    return this.trainingService.findAllCourses(includeInactive === 'true');
  }

  @UseGuards(StaffOnlyGuard)
  @Post('courses')
  createCourse(@Body() dto: UpsertCourseDto) {
    return this.trainingService.createCourse(dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch('courses/:id')
  updateCourse(@Param('id') id: string, @Body() dto: UpsertCourseDto) {
    return this.trainingService.updateCourse(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete('courses/:id')
  removeCourse(@Param('id') id: string) {
    return this.trainingService.removeCourse(id);
  }

  @UseGuards(StaffOnlyGuard)
  @Get('progress')
  getProgress(@Query('categories') categories?: string) {
    return this.trainingService.getProgressSummary(categories ? categories.split(',') : undefined);
  }

  @UseGuards(StaffOnlyGuard)
  @Post('assignments')
  assign(@Body() dto: AssignTrainingDto) {
    return this.trainingService.assign(dto.employeeIds, dto.courseIds);
  }

  @Patch('assignments/:id')
  updateStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAssignmentStatusDto) {
    const actingEmployeeId = req.user.kind === 'EMPLOYEE' ? req.user.sub : undefined;
    return this.trainingService.updateStatus(id, dto.status, actingEmployeeId);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete('assignments/:id')
  removeAssignment(@Param('id') id: string) {
    return this.trainingService.removeAssignment(id);
  }
}
