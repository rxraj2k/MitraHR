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
  Put,
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
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { ReplaceSkillsDto } from './dto/replace-skills.dto';
import { EMPLOYEE_DOCUMENT_TYPES } from './document-types';

// Roles & Permissions (minimal, Sprint 19 follow-up): only Admin/HR staff
// may set deploymentStatus/experienceLevel — everyone else's PATCH/POST is
// still allowed for every other field, just not these two. See auth's
// STAFF_ROLES for the full staff-role vocabulary this checks against.
const TALENT_DIRECTORY_FIELD_ROLES = ['ADMIN', 'HR'];
function assertCanEditTalentDirectoryFields(req: any, dto: { experienceLevel?: string; deploymentStatus?: string }) {
  if (dto.experienceLevel === undefined && dto.deploymentStatus === undefined) return;
  if (req.user.kind !== 'STAFF' || !TALENT_DIRECTORY_FIELD_ROLES.includes(req.user.role)) {
    throw new ForbiddenException('Only Admin or HR can change Experience Level or Deployment Status');
  }
}

const PHOTO_DIR = join(process.cwd(), 'uploads', 'employee-photos');
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Employee documents live outside the publicly-served `uploads/` root (see
// main.ts — only `uploads/` is mounted via useStaticAssets) so a document
// can only ever be fetched through the authenticated :id/documents/:id/file
// route below, not by guessing/sharing its raw URL.
const DOCUMENT_DIR = join(process.cwd(), 'secure-uploads', 'employee-documents');
const ALLOWED_DOCUMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

// Read access (findAll/findOne) is open to any logged-in session — staff and
// OTP-logged-in employees alike (the directory + org chart are meant to be
// viewable by everyone). Every write endpoint below is staff-only except
// "me", which lets an employee edit a small self-service whitelist on their
// own record only. Documents are the one exception to "open to everyone":
// findOne only attaches them for staff or the employee's own session (see
// the viewer check below), and they're never included in findAll at all.
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Get()
  findAll() {
    return this.employeesService.findAll();
  }

  @Patch('me')
  updateMe(@Req() req: any, @Body() dto: UpdateMyProfileDto) {
    if (req.user.kind !== 'EMPLOYEE') {
      throw new ForbiddenException('Only employee (OTP) accounts can use this endpoint');
    }
    return this.employeesService.update(req.user.sub, dto);
  }

  // Open to any logged-in user — the Home dashboard's birthday widget is
  // for the whole team, not just staff.
  @Get('birthdays/upcoming')
  upcomingBirthdays(@Query('days') days?: string) {
    return this.employeesService.upcomingBirthdays(days ? parseInt(days, 10) : 7);
  }

  // Staff-only, cross-employee document list for the Document Management
  // page — every employee's documents in one place so expiry can be
  // monitored company-wide.
  @UseGuards(StaffOnlyGuard)
  @Get('documents/all')
  findAllDocuments() {
    return this.employeesService.findAllDocuments();
  }

  // Same "my" pattern as /assets/my and /training/my: an OTP employee always
  // sees their own; a staff account sees the employee record it's linked to
  // (or one passed explicitly), for the Home dashboard's "My Documents" panel.
  @Get('documents/my')
  myDocuments(@Req() req: any, @Query('employeeId') employeeId?: string) {
    const targetId = req.user.kind === 'EMPLOYEE' ? req.user.sub : employeeId || req.user.employeeId;
    if (!targetId) throw new ForbiddenException('employeeId is required');
    return this.employeesService.findMyDocuments(targetId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const includeDocuments = req.user.kind === 'STAFF' || req.user.sub === id;
    return this.employeesService.findOne(id, { includeDocuments });
  }

  @Get(':id/designation-history')
  getDesignationHistory(@Param('id') id: string) {
    return this.employeesService.getDesignationHistory(id);
  }

  @UseGuards(StaffOnlyGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateEmployeeDto) {
    assertCanEditTalentDirectoryFields(req, dto);
    return this.employeesService.create(dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    assertCanEditTalentDirectoryFields(req, dto);
    return this.employeesService.update(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }

  @UseGuards(StaffOnlyGuard)
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

  @UseGuards(StaffOnlyGuard)
  @Put(':id/skills')
  replaceSkills(@Param('id') id: string, @Body() dto: ReplaceSkillsDto) {
    return this.employeesService.replaceSkills(id, dto);
  }

  @UseGuards(StaffOnlyGuard)
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
    @Body('expiryDate') expiryDate: string | undefined,
    @Body('notes') notes: string | undefined,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!documentType) throw new BadRequestException('documentType is required');
    if (!EMPLOYEE_DOCUMENT_TYPES.includes(documentType as any)) {
      throw new BadRequestException('Invalid documentType');
    }
    return this.employeesService.addDocument(
      id,
      documentType,
      file.originalname,
      `/secure-uploads/employee-documents/${file.filename}`,
      expiryDate || undefined,
      file.size,
      notes || undefined,
    );
  }

  @UseGuards(StaffOnlyGuard)
  @Patch(':id/documents/:documentId')
  updateDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Body('documentType') documentType: string | undefined,
    @Body('expiryDate') expiryDate: string | null | undefined,
    @Body('notes') notes: string | null | undefined,
  ) {
    if (documentType && !EMPLOYEE_DOCUMENT_TYPES.includes(documentType as any)) {
      throw new BadRequestException('Invalid documentType');
    }
    return this.employeesService.updateDocument(id, documentId, { documentType, expiryDate, notes });
  }

  @UseGuards(StaffOnlyGuard)
  @Delete(':id/documents/:documentId')
  removeDocument(@Param('id') id: string, @Param('documentId') documentId: string) {
    return this.employeesService.removeDocument(id, documentId);
  }

  // Authenticated file download — the only way to actually retrieve a
  // document's bytes, since it's no longer served from a public static path.
  @Get(':id/documents/:documentId/file')
  async downloadDocument(
    @Req() req: any,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ) {
    if (req.user.kind !== 'STAFF' && req.user.sub !== id) {
      throw new ForbiddenException('You can only view your own documents');
    }
    const { path, fileName } = await this.employeesService.getDocumentFile(id, documentId);
    res.download(path, fileName);
  }
}
