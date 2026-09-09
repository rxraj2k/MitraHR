import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ReplaceSkillsDto } from './dto/replace-skills.dto';

const BASE_INCLUDE = {
  department: true,
  designation: true,
  reportingManager: {
    select: { id: true, fullName: true, employeeCode: true },
  },
  skills: { include: { skill: true } },
};

// Documents (offer letters, ID proofs, etc.) are only ever attached to a
// response for staff, or an employee looking at their own record — see
// findOne()'s includeDocuments flag and the controller's viewer check.
const INCLUDE_WITH_DOCS = {
  ...BASE_INCLUDE,
  documents: { orderBy: { uploadedAt: 'desc' as const } },
};

const EMPLOYEE_CODE_PREFIX = 'OM-';
const EMPLOYEE_CODE_PAD = 4;

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    // The directory/org-chart listing never needs any one employee's document
    // list, so it's left out entirely here rather than filtered client-side.
    return this.prisma.employee.findMany({ orderBy: { fullName: 'asc' }, include: BASE_INCLUDE });
  }

  async findOne(id: string, opts: { includeDocuments?: boolean } = {}) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: opts.includeDocuments ? INCLUDE_WITH_DOCS : BASE_INCLUDE,
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  private async nextEmployeeCode(): Promise<string> {
    const counter = await this.prisma.counter.upsert({
      where: { name: 'employeeCode' },
      update: { value: { increment: 1 } },
      create: { name: 'employeeCode', value: 1 },
    });
    return `${EMPLOYEE_CODE_PREFIX}${String(counter.value).padStart(EMPLOYEE_CODE_PAD, '0')}`;
  }

  async create(dto: CreateEmployeeDto) {
    const employeeCode = await this.nextEmployeeCode();
    return this.prisma.employee.create({
      data: {
        ...dto,
        employeeCode,
        dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : undefined,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
      include: BASE_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id);
    return this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : undefined,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
      include: BASE_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.employee.delete({ where: { id } });
    return { success: true };
  }

  async setPhoto(id: string, photoUrl: string) {
    await this.findOne(id);
    return this.prisma.employee.update({ where: { id }, data: { photoUrl }, include: BASE_INCLUDE });
  }

  async replaceSkills(id: string, dto: ReplaceSkillsDto) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.employeeSkill.deleteMany({ where: { employeeId: id } }),
      this.prisma.employeeSkill.createMany({
        data: dto.skills.map((s) => ({
          employeeId: id,
          skillId: s.skillId,
          proficiency: s.proficiency,
          yearsExperience: s.yearsExperience,
        })),
      }),
    ]);
    return this.findOne(id);
  }

  async addDocument(
    id: string,
    documentType: string,
    fileName: string,
    fileUrl: string,
    expiryDate?: string,
  ) {
    await this.findOne(id);
    await this.prisma.employeeDocument.create({
      data: {
        employeeId: id,
        documentType,
        fileName,
        fileUrl,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      },
    });
    return this.findOne(id, { includeDocuments: true });
  }

  async updateDocument(
    id: string,
    documentId: string,
    updates: { documentType?: string; expiryDate?: string | null },
  ) {
    await this.findOne(id);
    const doc = await this.prisma.employeeDocument.findUnique({ where: { id: documentId } });
    if (!doc || doc.employeeId !== id) throw new NotFoundException('Document not found');
    await this.prisma.employeeDocument.update({
      where: { id: documentId },
      data: {
        documentType: updates.documentType,
        expiryDate:
          updates.expiryDate === undefined
            ? undefined
            : updates.expiryDate === null
              ? null
              : new Date(updates.expiryDate),
      },
    });
    return this.findOne(id, { includeDocuments: true });
  }

  async removeDocument(id: string, documentId: string) {
    await this.findOne(id);
    const doc = await this.prisma.employeeDocument.findUnique({ where: { id: documentId } });
    if (!doc || doc.employeeId !== id) throw new NotFoundException('Document not found');
    await this.prisma.employeeDocument.delete({ where: { id: documentId } });
    return this.findOne(id, { includeDocuments: true });
  }

  // Cross-employee view for the staff-only Document Management page — every
  // employee document in one list, so expiry can be monitored company-wide
  // instead of digging through profiles one at a time.
  findAllDocuments() {
    return this.prisma.employeeDocument.findMany({
      include: { employee: { select: { id: true, fullName: true, photoUrl: true, employeeCode: true } } },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  findMyDocuments(employeeId: string) {
    return this.prisma.employeeDocument.findMany({
      where: { employeeId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  // fileUrl is stored as a root-relative disk path (e.g.
  // "/secure-uploads/employee-documents/xyz.pdf"), so it can be resolved
  // straight off process.cwd() regardless of which upload generation wrote
  // it — this is what lets the authenticated download route serve files
  // that predate the secure-uploads split without a data migration.
  async getDocumentFile(id: string, documentId: string) {
    const doc = await this.prisma.employeeDocument.findUnique({ where: { id: documentId } });
    if (!doc || doc.employeeId !== id) throw new NotFoundException('Document not found');
    return { path: join(process.cwd(), doc.fileUrl.replace(/^\//, '')), fileName: doc.fileName };
  }
}
