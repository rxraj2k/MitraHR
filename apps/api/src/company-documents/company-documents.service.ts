import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompanyDocumentsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.companyDocument.findMany({ orderBy: { uploadedAt: 'desc' } });
  }

  async findOne(id: string) {
    const doc = await this.prisma.companyDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  create(category: string, title: string, fileName: string, fileUrl: string) {
    return this.prisma.companyDocument.create({ data: { category, title, fileName, fileUrl } });
  }

  async update(id: string, updates: { category?: string; title?: string }) {
    await this.findOne(id);
    return this.prisma.companyDocument.update({ where: { id }, data: updates });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.companyDocument.delete({ where: { id } });
    return { success: true };
  }

  // Same root-relative-fileUrl trick as EmployeesService.getDocumentFile.
  async getFile(id: string) {
    const doc = await this.findOne(id);
    return { path: join(process.cwd(), doc.fileUrl.replace(/^\//, '')), fileName: doc.fileName };
  }
}
