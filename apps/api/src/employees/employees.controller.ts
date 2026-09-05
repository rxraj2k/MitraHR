import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ReplaceSkillsDto } from './dto/replace-skills.dto';

const PHOTO_DIR = join(process.cwd(), 'uploads', 'employee-photos');
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const DOCUMENT_DIR = join(process.cwd(), 'uploads', 'employee-documents');
const ALLOWED_DOCUMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Get()
  findAll() {
    return this.employeesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }

  @Post(':id/photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, PHOTO_DIR),
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
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadPhoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No photo uploaded');
    return this.employeesService.setPhoto(id, `/uploads/employee-photos/${file.filename}`);
  }

  @Put(':id/skills')
  replaceSkills(@Param('id') id: string, @Body() dto: ReplaceSkillsDto) {
    return this.employeesService.replaceSkills(id, dto);
  }

  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, DOCUMENT_DIR),
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
          return cb(new BadRequestException('Only JPEG, PNG, WEBP, GIF, or PDF files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadDocument(
    @Param('id') id: string,
    @Body('documentType') documentType: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!documentType) throw new BadRequestException('documentType is required');
    return this.employeesService.addDocument(
      id,
      documentType,
      file.originalname,
      `/uploads/employee-documents/${file.filename}`,
    );
  }

  @Delete(':id/documents/:documentId')
  removeDocument(@Param('id') id: string, @Param('documentId') documentId: string) {
    return this.employeesService.removeDocument(id, documentId);
  }
}
