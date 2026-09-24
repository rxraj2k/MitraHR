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
import { RecruitmentService } from './recruitment.service';
import { CreateJobOpeningDto } from './dto/create-job-opening.dto';
import { UpdateJobOpeningDto } from './dto/update-job-opening.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { ConvertCandidateDto } from './dto/convert-candidate.dto';

const RESUME_DIR = join(process.cwd(), 'secure-uploads', 'candidate-resumes');
const ALLOWED_RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Candidate data (names, emails, phone numbers, resumes, interview notes,
// ratings, rejection reasons) is at least as sensitive as employee records
// — staff only, same as EmployeesController write endpoints and every
// other business-sensitive module in this app.
@UseGuards(JwtAuthGuard, StaffOnlyGuard)
@Controller('recruitment')
export class RecruitmentController {
  constructor(private service: RecruitmentService) {}

  @Get('openings')
  findAllOpenings(@Query('status') status?: string) {
    return this.service.findAllOpenings(status);
  }

  @Get('openings/:id')
  findOneOpening(@Param('id') id: string) {
    return this.service.findOneOpening(id);
  }

  @Post('openings')
  createOpening(@Body() dto: CreateJobOpeningDto) {
    return this.service.createOpening(dto);
  }

  @Patch('openings/:id')
  updateOpening(@Param('id') id: string, @Body() dto: UpdateJobOpeningDto) {
    return this.service.updateOpening(id, dto);
  }

  @Delete('openings/:id')
  removeOpening(@Param('id') id: string) {
    return this.service.removeOpening(id);
  }

  @Get('candidates')
  findCandidates(@Query('jobOpeningId') jobOpeningId?: string, @Query('stage') stage?: string) {
    return this.service.findCandidates(jobOpeningId, stage);
  }

  @Get('candidates/:id')
  findOneCandidate(@Param('id') id: string) {
    return this.service.findOneCandidate(id);
  }

  @Post('candidates')
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, RESUME_DIR),
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_RESUME_TYPES.includes(file.mimetype)) {
          return cb(new BadRequestException('Only PDF, DOC, or DOCX resumes are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  createCandidate(
    @Body('jobOpeningId') jobOpeningId: string,
    @Body('fullName') fullName: string,
    @Body('email') email: string,
    @Body('phone') phone: string | undefined,
    @Body('source') source: string | undefined,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!jobOpeningId) throw new BadRequestException('jobOpeningId is required');
    if (!fullName) throw new BadRequestException('fullName is required');
    if (!email) throw new BadRequestException('email is required');
    return this.service.createCandidate({
      jobOpeningId,
      fullName,
      email,
      phone: phone || undefined,
      source: source || undefined,
      resumeFileName: file?.originalname,
      resumeUrl: file ? `/secure-uploads/candidate-resumes/${file.filename}` : undefined,
    });
  }

  @Patch('candidates/:id')
  updateCandidate(@Param('id') id: string, @Body() dto: UpdateCandidateDto) {
    return this.service.updateCandidate(id, dto);
  }

  @Delete('candidates/:id')
  removeCandidate(@Param('id') id: string) {
    return this.service.removeCandidate(id);
  }

  @Post('candidates/:id/convert')
  convertToEmployee(@Param('id') id: string, @Body() dto: ConvertCandidateDto) {
    return this.service.convertToEmployee(id, dto);
  }

  @Get('candidates/:id/resume')
  async downloadResume(@Param('id') id: string, @Res() res: Response) {
    const { path, fileName } = await this.service.getResumeFile(id);
    res.download(path, fileName);
  }
}
