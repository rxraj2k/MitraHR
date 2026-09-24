import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecognitionService } from './recognition.service';
import { CreateRecognitionDto } from './dto/create-recognition.dto';
import { CreateRecognitionCommentDto } from './dto/create-recognition-comment.dto';
import { AddRecognitionReactionDto } from './dto/add-recognition-reaction.dto';

// Same "resolve whichever session kind this is" helper used throughout the
// app — an OTP-logged-in employee acts as themselves; a staff account can
// only act as an employee if their User is linked to one.
function resolveEmployeeId(user: any): string | null {
  return user.kind === 'EMPLOYEE' ? user.sub : user.employeeId ?? null;
}

@UseGuards(JwtAuthGuard)
@Controller('recognitions')
export class RecognitionController {
  constructor(private service: RecognitionService) {}

  @Get()
  findFeed(@Req() req: any, @Query('toEmployeeId') toEmployeeId?: string, @Query('category') category?: string, @Query('limit') limit?: string) {
    return this.service.findFeed(resolveEmployeeId(req.user), {
      toEmployeeId,
      category,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('leaderboard')
  leaderboard(@Query('days') days?: string) {
    return this.service.leaderboard(days ? Number(days) : 30);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateRecognitionDto) {
    return this.service.create(req.user, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(id, req.user);
  }

  @Post(':id/reactions')
  addReaction(@Req() req: any, @Param('id') id: string, @Body() dto: AddRecognitionReactionDto) {
    const employeeId = resolveEmployeeId(req.user);
    if (!employeeId) throw new ForbiddenException('This action requires an employee record linked to your account');
    return this.service.addReaction(id, employeeId, dto.reactionType);
  }

  @Delete(':id/reactions/:reactionType')
  removeReaction(@Req() req: any, @Param('id') id: string, @Param('reactionType') reactionType: string) {
    const employeeId = resolveEmployeeId(req.user);
    if (!employeeId) throw new ForbiddenException('This action requires an employee record linked to your account');
    return this.service.removeReaction(id, employeeId, reactionType);
  }

  @Get(':id/comments')
  listComments(@Param('id') id: string) {
    return this.service.listComments(id);
  }

  @Post(':id/comments')
  addComment(@Req() req: any, @Param('id') id: string, @Body() dto: CreateRecognitionCommentDto) {
    const employeeId = resolveEmployeeId(req.user);
    if (!employeeId) throw new ForbiddenException('This action requires an employee record linked to your account');
    return this.service.addComment(id, employeeId, dto.body);
  }

  @Delete(':id/comments/:commentId')
  deleteComment(@Req() req: any, @Param('commentId') commentId: string) {
    return this.service.deleteComment(commentId, req.user);
  }
}
