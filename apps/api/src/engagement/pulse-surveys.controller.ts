import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { PulseSurveysService } from './pulse-surveys.service';
import { CreatePulseSurveyDto } from './dto/create-pulse-survey.dto';
import { UpdatePulseSurveyDto } from './dto/update-pulse-survey.dto';
import { SubmitPulseSurveyResponseDto } from './dto/submit-pulse-survey-response.dto';

@UseGuards(JwtAuthGuard)
@Controller('pulse-surveys')
export class PulseSurveysController {
  constructor(private service: PulseSurveysService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findAllForViewer(req.user);
  }

  // Declared before ':id' so 'insights' isn't swallowed by the id param route.
  @Get('insights')
  getInsights() {
    return this.service.getInsights();
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOneForViewer(id, req.user);
  }

  @Get(':id/results')
  getResults(@Req() req: any, @Param('id') id: string) {
    return this.service.getResults(id, req.user);
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreatePulseSurveyDto) {
    return this.service.create(req.user.sub, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePulseSurveyDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/responses')
  submitResponse(@Req() req: any, @Param('id') id: string, @Body() dto: SubmitPulseSurveyResponseDto) {
    return this.service.submitResponse(id, req.user, dto);
  }
}
