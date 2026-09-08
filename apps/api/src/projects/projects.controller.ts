import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { ProjectsService } from './projects.service';
import { UpsertProjectDto } from './dto/upsert-project.dto';
import { EndProjectDto } from './dto/end-project.dto';
import { CreateAssignmentDto, UpdateAssignmentDto } from './dto/upsert-assignment.dto';

// Full project/client detail is staff-only. An employee (OTP session) can
// only reach their own scoped "My Projects" list via GET /projects/my.
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get('my')
  myProjects(@Req() req: any, @Query('employeeId') employeeId?: string) {
    const targetId = req.user.kind === 'EMPLOYEE' ? req.user.sub : employeeId || req.user.employeeId;
    if (!targetId) throw new ForbiddenException('employeeId is required');
    return this.projectsService.findForEmployee(targetId);
  }

  @UseGuards(StaffOnlyGuard)
  @Get()
  findAll(@Query('clientId') clientId?: string, @Query('status') status?: string) {
    return this.projectsService.findAll({ clientId, status });
  }

  @UseGuards(StaffOnlyGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  create(@Body() dto: UpsertProjectDto) {
    return this.projectsService.create(dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpsertProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  // Marks the project ended: sets status to COMPLETED, records the end
  // date (today, unless backdated) and a closing summary, and closes out
  // any still-active team assignments as of that same date.
  @UseGuards(StaffOnlyGuard)
  @Patch(':id/end')
  end(@Param('id') id: string, @Body() dto: EndProjectDto) {
    return this.projectsService.end(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Post(':id/assignments')
  addAssignment(@Param('id') id: string, @Body() dto: CreateAssignmentDto) {
    return this.projectsService.addAssignment(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id/assignments/:assignmentId')
  updateAssignment(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.projectsService.updateAssignment(id, assignmentId, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id/assignments/:assignmentId')
  removeAssignment(@Param('id') id: string, @Param('assignmentId') assignmentId: string) {
    return this.projectsService.removeAssignment(id, assignmentId);
  }
}
