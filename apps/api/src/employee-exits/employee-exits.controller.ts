import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { EmployeeExitsService } from './employee-exits.service';
import { InitiateExitDto } from './dto/initiate-exit.dto';
import { UpdateExitDto } from './dto/update-exit.dto';
import { UpdateExitFeedbackDto } from './dto/update-exit-feedback.dto';
import { UpdateClearanceItemDto } from './dto/update-clearance-item.dto';
import { ApproveCategoryDto } from './dto/approve-category.dto';
import { UpsertHandoverDto } from './dto/upsert-handover.dto';

const EXIT_DOCS_DIR = join(process.cwd(), 'secure-uploads', 'employee-exits');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const EXIT_DOCUMENT_TYPES = [
  'RESIGNATION_ACCEPTANCE',
  'RELIEVING_LETTER',
  'EXPERIENCE_CERTIFICATE',
  'NDA',
  'OTHER',
] as const;

// Offboarding data is as sensitive as employee records themselves —
// staff-only end to end, no employee-facing read (matches Clients).
@UseGuards(JwtAuthGuard, StaffOnlyGuard)
@Controller('employee-exits')
export class EmployeeExitsController {
  constructor(private service: EmployeeExitsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  initiate(@Body() dto: InitiateExitDto) {
    return this.service.initiate(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExitDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/feedback')
  updateFeedback(@Param('id') id: string, @Body() dto: UpdateExitFeedbackDto) {
    return this.service.updateFeedback(id, dto);
  }

  @Patch(':id/items/:itemId')
  updateItem(@Param('id') id: string, @Param('itemId') itemId: string, @Body() dto: UpdateClearanceItemDto) {
    return this.service.updateItem(id, itemId, dto);
  }

  // req.user is the JwtStrategy payload (STAFF session) — approvedBy is a
  // display-name snapshot, not a foreign key, since there's no
  // per-department "lead" role yet (see schema comment on
  // ExitCategoryApproval).
  @Post(':id/approvals/:group')
  approveCategory(@Param('id') id: string, @Param('group') group: string, @Body() dto: ApproveCategoryDto, @Req() req: any) {
    const approvedBy = `${req.user.name} (${req.user.role})`;
    return this.service.approveCategory(id, group, approvedBy, dto.notes);
  }

  @Delete(':id/approvals/:group')
  revokeCategoryApproval(@Param('id') id: string, @Param('group') group: string) {
    return this.service.revokeCategoryApproval(id, group);
  }

  @Post(':id/handovers')
  upsertHandover(@Param('id') id: string, @Body() dto: UpsertHandoverDto) {
    return this.service.upsertHandover(id, dto);
  }

  @Delete(':id/handovers/:handoverId')
  removeHandover(@Param('id') id: string, @Param('handoverId') handoverId: string) {
    return this.service.removeHandover(id, handoverId);
  }

  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, EXIT_DOCS_DIR),
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
          return cb(new BadRequestException('Only JPEG, PNG, WEBP, or PDF files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  addDocument(
    @Param('id') id: string,
    @Body('docType') docType: string | undefined,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('A file is required');
    if (!docType || !EXIT_DOCUMENT_TYPES.includes(docType as any)) {
      throw new BadRequestException('Invalid document type');
    }
    return this.service.addDocument(id, {
      docType,
      fileName: file.originalname,
      fileUrl: `/secure-uploads/employee-exits/${file.filename}`,
    });
  }

  @Get(':id/documents/:docId/file')
  async downloadDocument(@Param('id') id: string, @Param('docId') docId: string, @Res() res: Response) {
    const { path, fileName } = await this.service.getDocumentFile(id, docId);
    res.download(path, fileName);
  }

  @Delete(':id/documents/:docId')
  removeDocument(@Param('id') id: string, @Param('docId') docId: string) {
    return this.service.removeDocument(id, docId);
  }

  @Post(':id/clear')
  markCleared(@Param('id') id: string) {
    return this.service.markCleared(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
