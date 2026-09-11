import {
  BadRequestException,
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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffOnlyGuard } from '../auth/staff-only.guard';
import { AnnouncementsService } from './announcements.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

const ATTACHMENT_DIR = join(process.cwd(), 'secure-uploads', 'announcements');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const AUDIENCE_TYPES = ['ALL', 'DEPARTMENTS', 'INDIVIDUALS'] as const;

// Same "resolve whichever session kind this is" pattern used across the
// app (e.g. leave-requests.controller.ts): an OTP-logged-in employee acts
// as themselves directly; a staff account can only act as an employee if
// their User is linked to one.
function resolveEmployeeId(user: any): string {
  const id = user.kind === 'EMPLOYEE' ? user.sub : user.employeeId;
  if (!id) throw new ForbiddenException('This action requires an employee record linked to your account');
  return id;
}

// Multipart form fields arrive as plain strings, so a targeted audience
// list is sent as a JSON-encoded string rather than repeated form fields.
function parseIdArray(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

@UseGuards(JwtAuthGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private service: AnnouncementsService) {}

  @Get()
  findAll(@Req() req: any, @Query('includeExpired') includeExpired?: string) {
    return this.service.findAllForViewer(req.user, includeExpired === 'true');
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, ATTACHMENT_DIR),
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
          return cb(new BadRequestException('Only JPEG, PNG, WEBP, GIF, or PDF attachments are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  create(@Req() req: any, @Body() body: Record<string, string>, @UploadedFile() file?: Express.Multer.File) {
    if (!body.title?.trim()) throw new BadRequestException('title is required');
    if (!body.body?.trim()) throw new BadRequestException('body is required');
    const audienceType = body.audienceType as (typeof AUDIENCE_TYPES)[number];
    if (!AUDIENCE_TYPES.includes(audienceType)) throw new BadRequestException('Invalid audienceType');

    const audienceDepartmentIds = parseIdArray(body.audienceDepartmentIds);
    const audienceEmployeeIds = parseIdArray(body.audienceEmployeeIds);
    if (audienceType === 'DEPARTMENTS' && audienceDepartmentIds.length === 0) {
      throw new BadRequestException('Select at least one department to target');
    }
    if (audienceType === 'INDIVIDUALS' && audienceEmployeeIds.length === 0) {
      throw new BadRequestException('Select at least one employee to target');
    }

    return this.service.create(req.user.sub, {
      title: body.title.trim(),
      body: body.body,
      category: body.category || undefined,
      pinned: body.pinned === 'true',
      commentsDisabled: body.commentsDisabled === 'true',
      audienceType,
      audienceDepartmentIds,
      audienceEmployeeIds,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      attachmentUrl: file ? `/secure-uploads/announcements/${file.filename}` : undefined,
      attachmentName: file ? file.originalname : undefined,
    });
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/file')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { path, fileName } = await this.service.getFile(id);
    res.download(path, fileName);
  }

  @Post(':id/like')
  like(@Req() req: any, @Param('id') id: string) {
    return this.service.like(id, resolveEmployeeId(req.user));
  }

  @Delete(':id/like')
  unlike(@Req() req: any, @Param('id') id: string) {
    return this.service.unlike(id, resolveEmployeeId(req.user));
  }

  @Get(':id/comments')
  listComments(@Param('id') id: string) {
    return this.service.listComments(id);
  }

  @Post(':id/comments')
  addComment(@Req() req: any, @Param('id') id: string, @Body() dto: CreateCommentDto) {
    return this.service.addComment(id, resolveEmployeeId(req.user), dto.body);
  }

  @Delete(':id/comments/:commentId')
  deleteComment(@Req() req: any, @Param('commentId') commentId: string) {
    return this.service.deleteComment(commentId, req.user);
  }
}
