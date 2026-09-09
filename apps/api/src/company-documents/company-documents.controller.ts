import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { CompanyDocumentsService } from './company-documents.service';
import { COMPANY_DOCUMENT_CATEGORIES, UpdateCompanyDocumentDto } from './dto/update-company-document.dto';

const DOCUMENT_DIR = join(process.cwd(), 'secure-uploads', 'company-documents');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

// Readable by any logged-in user (staff or employee) — these are company
// policies/templates, not private records. Managed by staff only.
@UseGuards(JwtAuthGuard)
@Controller('company-documents')
export class CompanyDocumentsController {
  constructor(private service: CompanyDocumentsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, DOCUMENT_DIR),
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
          return cb(new BadRequestException('Only JPEG, PNG, WEBP, GIF, or PDF files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  create(
    @Body('category') category: string,
    @Body('title') title: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!title) throw new BadRequestException('title is required');
    if (!COMPANY_DOCUMENT_CATEGORIES.includes(category as any)) {
      throw new BadRequestException('Invalid category');
    }
    return this.service.create(category, title, file.originalname, `/secure-uploads/company-documents/${file.filename}`);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDocumentDto) {
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
}
