import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OfficeWallService, resolveEmployeeId, SessionUser } from './office-wall.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateOfficeWallCommentDto } from './dto/create-comment.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { SharePostDto } from './dto/share-post.dto';

// Posted photos live under the publicly-served uploads/ root (see main.ts)
// -- same convention as employee-photos: fine for casual images meant to
// render inline in a feed, unlike secure-uploads/ documents.
const MEDIA_DIR = join(process.cwd(), 'uploads', 'office-wall');
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function requireEmployeeId(user: SessionUser): string {
  const id = resolveEmployeeId(user);
  if (!id) throw new ForbiddenException('This action requires an employee record linked to your account');
  return id;
}

@UseGuards(JwtAuthGuard)
@Controller('office-wall')
export class OfficeWallController {
  constructor(private service: OfficeWallService) {}

  @Get('posts')
  findFeed(@Req() req: any, @Query('category') category?: string, @Query('hashtag') hashtag?: string, @Query('limit') limit?: string) {
    return this.service.findFeed(resolveEmployeeId(req.user), { category, hashtag, limit: limit ? Number(limit) : undefined });
  }

  @Post('posts')
  create(@Req() req: any, @Body() dto: CreatePostDto) {
    return this.service.create(req.user, dto);
  }

  @Delete('posts/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(id, req.user);
  }

  @Post('posts/:id/media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, MEDIA_DIR),
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
          return cb(new BadRequestException('Only JPEG, PNG, WEBP, or GIF images are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  addMedia(@Req() req: any, @Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No image uploaded');
    return this.service.addMedia(id, req.user, `/uploads/office-wall/${file.filename}`, file.originalname);
  }

  @Post('posts/:id/reactions')
  addReaction(@Req() req: any, @Param('id') id: string, @Body() dto: AddReactionDto) {
    return this.service.addReaction(id, requireEmployeeId(req.user), dto.reactionType);
  }

  @Delete('posts/:id/reactions/:reactionType')
  removeReaction(@Req() req: any, @Param('id') id: string, @Param('reactionType') reactionType: string) {
    return this.service.removeReaction(id, requireEmployeeId(req.user), reactionType);
  }

  @Get('posts/:id/comments')
  listComments(@Param('id') id: string) {
    return this.service.listComments(id);
  }

  @Post('posts/:id/comments')
  addComment(@Req() req: any, @Param('id') id: string, @Body() dto: CreateOfficeWallCommentDto) {
    return this.service.addComment(id, requireEmployeeId(req.user), dto.body);
  }

  @Delete('comments/:commentId')
  deleteComment(@Req() req: any, @Param('commentId') commentId: string) {
    return this.service.deleteComment(commentId, req.user);
  }

  @Post('posts/:id/share')
  share(@Req() req: any, @Param('id') id: string, @Body() dto: SharePostDto) {
    return this.service.sharePost(id, requireEmployeeId(req.user), dto.toEmployeeId);
  }

  @Get('online')
  getOnline() {
    return this.service.getOnlinePresence();
  }
}
