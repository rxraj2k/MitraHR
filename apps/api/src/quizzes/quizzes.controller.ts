import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { QuizzesService } from './quizzes.service';
import { UpsertQuizDto } from './dto/upsert-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

// Routes span three concerns (course/track-scoped authoring, employee-scoped
// take/submit, org-wide results) so this controller uses full explicit
// paths per route rather than one @Controller(prefix) — same reasoning as
// TrainingController keeping /training/my alongside /training/courses.
@UseGuards(JwtAuthGuard)
@Controller()
export class QuizzesController {
  constructor(private quizzes: QuizzesService) {}

  // --- Staff authoring: course-scoped (Learning Center > Assessments > Manage) ---

  @UseGuards(StaffOnlyGuard)
  @Get('training/courses/:courseId/quiz')
  getForCourse(@Param('courseId') courseId: string) {
    return this.quizzes.getForCourseStaff(courseId);
  }

  @UseGuards(StaffOnlyGuard)
  @Put('training/courses/:courseId/quiz')
  upsert(@Param('courseId') courseId: string, @Body() dto: UpsertQuizDto) {
    return this.quizzes.upsertForCourse(courseId, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete('training/courses/:courseId/quiz')
  remove(@Param('courseId') courseId: string) {
    return this.quizzes.removeForCourse(courseId);
  }

  // --- Staff authoring: track-scoped (Mandatory Training's single assessment) ---

  @UseGuards(StaffOnlyGuard)
  @Get('training/tracks/:track/quiz')
  getForTrack(@Param('track') track: string) {
    return this.quizzes.getForTrackStaff(track);
  }

  @UseGuards(StaffOnlyGuard)
  @Put('training/tracks/:track/quiz')
  upsertTrack(@Param('track') track: string, @Body() dto: UpsertQuizDto) {
    return this.quizzes.upsertForTrack(track, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete('training/tracks/:track/quiz')
  removeTrack(@Param('track') track: string) {
    return this.quizzes.removeForTrack(track);
  }

  // Employee-facing discovery for the track-wide assessment (there's no
  // single course to attach a "Take Assessment" button to). Staff may pass
  // employeeId to preview a specific employee's unlock state, same
  // convention as /training/my elsewhere in this app.
  @Get('training/tracks/:track/quiz-status')
  trackQuizStatus(@Req() req: any, @Param('track') track: string, @Query('employeeId') employeeId?: string) {
    const targetId = req.user.kind === 'EMPLOYEE' ? req.user.sub : employeeId || req.user.employeeId;
    if (!targetId) throw new ForbiddenException('employeeId is required');
    return this.quizzes.trackQuizStatus(track, targetId);
  }

  // --- Employee take/submit ---

  @Get('quizzes/:id/take')
  take(@Req() req: any, @Param('id') id: string, @Query('employeeId') employeeId?: string) {
    const targetId = req.user.kind === 'EMPLOYEE' ? req.user.sub : employeeId || req.user.employeeId;
    if (!targetId) throw new ForbiddenException('employeeId is required');
    return this.quizzes.getForEmployee(id, targetId);
  }

  @Post('quizzes/:id/submit')
  submit(@Req() req: any, @Param('id') id: string, @Body() dto: SubmitQuizDto) {
    const targetId = req.user.kind === 'EMPLOYEE' ? req.user.sub : dto.employeeId || req.user.employeeId;
    if (!targetId) throw new ForbiddenException('employeeId is required');
    return this.quizzes.submit(id, targetId, dto);
  }

  // --- Results / dashboard ---

  @UseGuards(StaffOnlyGuard)
  @Get('quiz-results')
  results(@Query('categories') categories?: string) {
    return this.quizzes.resultsForStaff(categories ? categories.split(',') : undefined);
  }

  @Get('my-quiz-results')
  myResults(@Req() req: any, @Query('employeeId') employeeId?: string, @Query('categories') categories?: string) {
    const targetId = req.user.kind === 'EMPLOYEE' ? req.user.sub : employeeId || req.user.employeeId;
    if (!targetId) throw new ForbiddenException('employeeId is required');
    return this.quizzes.myResults(targetId, categories ? categories.split(',') : undefined);
  }

  @UseGuards(StaffOnlyGuard)
  @Get('quiz-dashboard-stats')
  dashboardStats(@Query('categories') categories?: string) {
    return this.quizzes.dashboardStats(categories ? categories.split(',') : undefined);
  }
}
