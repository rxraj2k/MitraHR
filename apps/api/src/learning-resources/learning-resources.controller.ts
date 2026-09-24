import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LearningResourcesService } from './learning-resources.service';

function parseTrack(track?: string): 'IAM' | 'DEVOPS' {
  if (track === 'IAM' || track === 'DEVOPS') return track;
  throw new BadRequestException('track must be IAM or DEVOPS');
}

// Any signed-in user (employee or staff) — these are for whoever is doing
// the learning to actually use, same sensitivity as their own /training/my.
@UseGuards(JwtAuthGuard)
@Controller('learning-resources')
export class LearningResourcesController {
  constructor(private service: LearningResourcesService) {}

  @Get('portals')
  getPortals(@Query('track') track?: string) {
    return this.service.getPortals(parseTrack(track));
  }

  @Get('reference')
  getReference(@Query('track') track?: string) {
    return this.service.getReference(parseTrack(track));
  }
}
