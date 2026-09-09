import {
  BadRequestException,
  Body,
  Controller,
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
import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { DecideLeaveRequestDto } from './dto/decide-leave-request.dto';

// Kept outside the publicly-served `uploads/` root (see main.ts) since
// medical certificates and similar attachments shouldn't be fetchable by
// URL alone — the :id/attachment route below is the only way to read one.
const ATTACHMENT_DIR = join(process.cwd(), 'secure-uploads', 'leave-attachments');
const ALLOWED_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

// Employees (OTP sessions) can submit/cancel/view their own requests and
// balances. Staff can do the same for anyone, plus approve/reject. The
// team calendar is open to any logged-in session.
@UseGuards(JwtAuthGuard)
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private leaveRequestsService: LeaveRequestsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateLeaveRequestDto) {
    let employeeId: string;
    if (req.user.kind === 'EMPLOYEE') {
      employeeId = req.user.sub;
    } else {
      if (!dto.employeeId) {
        throw new ForbiddenException('employeeId is required when submitting on behalf of an employee');
      }
      employeeId = dto.employeeId;
    }
    return this.leaveRequestsService.create(employeeId, dto);
  }

  @Get('balances')
  balances(@Req() req: any, @Query('employeeId') employeeId?: string) {
    const targetId = req.user.kind === 'EMPLOYEE' ? req.user.sub : employeeId;
    if (!targetId) throw new ForbiddenException('employeeId is required');
    return this.leaveRequestsService.balancesForEmployee(targetId);
  }

  @Get('calendar')
  calendar(@Query('year') year?: string, @Query('month') month?: string) {
    const now = new Date();
    const y = year ? parseInt(year, 10) : now.getUTCFullYear();
    const m = month ? parseInt(month, 10) : now.getUTCMonth() + 1;
    return this.leaveRequestsService.calendar(y, m);
  }

  @Get()
  findAll(@Req() req: any, @Query('employeeId') employeeId?: string, @Query('status') status?: string) {
    if (req.user.kind === 'EMPLOYEE') {
      return this.leaveRequestsService.findForEmployee(req.user.sub);
    }
    return this.leaveRequestsService.findAll({ employeeId, status });
  }

  @Patch(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.leaveRequestsService.cancel(id, req.user);
  }

  // Owner (the employee this request belongs to) or any staff member may
  // attach a supporting document — e.g. a doctor's note for sick leave —
  // at any point, not just when the request is first submitted. Ownership
  // for employee sessions is enforced in the service.
  @Post(':id/attachment')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, ATTACHMENT_DIR),
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_ATTACHMENT_TYPES.includes(file.mimetype)) {
          return cb(new BadRequestException('Only JPEG, PNG, WEBP, GIF, or PDF files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadAttachment(@Req() req: any, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.leaveRequestsService.addAttachment(
      id,
      req.user,
      file.originalname,
      `/secure-uploads/leave-attachments/${file.filename}`,
    );
  }

  // Owner or staff only — mirrors the upload ownership check above.
  @Get(':id/attachment')
  async downloadAttachment(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const { path, fileName } = await this.leaveRequestsService.getAttachmentFile(id, req.user);
    res.download(path, fileName);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id/decide')
  decide(@Req() req: any, @Param('id') id: string, @Body() dto: DecideLeaveRequestDto) {
    return this.leaveRequestsService.decide(id, req.user.sub, dto.status, dto.decisionNote);
  }
}
