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
import { ClientContractsService } from './client-contracts.service';
import { CLIENT_CONTRACT_STATUSES, UpdateClientContractDto } from './dto/update-client-contract.dto';

const CONTRACT_DIR = join(process.cwd(), 'secure-uploads', 'client-contracts');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// Client contracts are as business-sensitive as the Client records they
// belong to (see ClientsController) — staff-only end to end, same
// diskStorage/secure-uploads convention as CompanyDocumentsController.
// The signed file is optional: a contract can be logged before the
// scanned copy is on hand.
@UseGuards(JwtAuthGuard, StaffOnlyGuard)
@Controller('client-contracts')
export class ClientContractsController {
  constructor(private service: ClientContractsService) {}

  @Get()
  findAll(@Query('clientId') clientId?: string) {
    return this.service.findAll(clientId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, CONTRACT_DIR),
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
  create(
    @Body('clientId') clientId: string,
    @Body('title') title: string,
    @Body('contractType') contractType: string | undefined,
    @Body('startDate') startDate: string | undefined,
    @Body('endDate') endDate: string | undefined,
    @Body('value') value: string | undefined,
    @Body('status') status: string | undefined,
    @Body('notes') notes: string | undefined,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!clientId) throw new BadRequestException('clientId is required');
    if (!title) throw new BadRequestException('title is required');
    if (status && !CLIENT_CONTRACT_STATUSES.includes(status as any)) {
      throw new BadRequestException('Invalid status');
    }
    return this.service.create({
      clientId,
      title,
      contractType: contractType || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      value: value || undefined,
      status: status || undefined,
      notes: notes || undefined,
      fileName: file?.originalname,
      fileUrl: file ? `/secure-uploads/client-contracts/${file.filename}` : undefined,
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientContractDto) {
    return this.service.update(id, dto);
  }

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
