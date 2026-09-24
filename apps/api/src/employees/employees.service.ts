import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ReplaceSkillsDto } from './dto/replace-skills.dto';

// Talent Directory (Sprint 19): only OPEN (endDate: null) assignments — same
// "currently active" convention ProjectsService.end() uses when it closes an
// assignment out. This backs the Talent Directory table's "Client
// Allocation" tag; the drawer's full history (including past/closed
// assignments) is fetched separately via GET /projects/my?employeeId=.
const BASE_INCLUDE = {
  department: true,
  designation: true,
  reportingManager: {
    select: { id: true, fullName: true, employeeCode: true },
  },
  skills: { include: { skill: true } },
  projectAssignments: {
    where: { endDate: null },
    include: { project: { include: { client: { select: { id: true, name: true } } } } },
    orderBy: [{ allocationPercent: 'desc' as const }, { startDate: 'desc' as const }],
  },
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
    const employee = await this.prisma.employee.create({
      data: {
        ...dto,
        employeeCode,
        dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : undefined,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
      include: BASE_INCLUDE,
    });
    // Log the starting designation as the first history entry (fromDesignationId
    // stays null — there's genuinely no prior one for a new hire).
    if (dto.designationId) {
      await this.prisma.designationHistory.create({
        data: { employeeId: employee.id, fromDesignationId: null, toDesignationId: dto.designationId, note: 'Hired' },
      });
    }
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const existing = await this.findOne(id);
    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : undefined,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
      include: BASE_INCLUDE,
    });
    // Sprint 16: auto-log a designation change — never a separate manual
    // step, so the history can't drift out of sync with what was actually
    // saved on the employee record.
    if (dto.designationId !== undefined) {
      const nextDesignationId = dto.designationId || null;
      const prevDesignationId = existing.designationId || null;
      if (nextDesignationId !== prevDesignationId) {
        await this.prisma.designationHistory.create({
          data: { employeeId: id, fromDesignationId: prevDesignationId, toDesignationId: nextDesignationId },
        });
      }
    }
    return updated;
  }

  async getDesignationHistory(id: string) {
    await this.findOne(id);
    return this.prisma.designationHistory.findMany({
      where: { employeeId: id },
      include: { fromDesignation: { select: { name: true } }, toDesignation: { select: { name: true } } },
      orderBy: { changedAt: 'desc' },
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
    fileSize?: number,
    notes?: string,
  ) {
    await this.findOne(id);
    await this.prisma.employeeDocument.create({
      data: {
        employeeId: id,
        documentType,
        fileName,
        fileUrl,
        fileSize,
        notes,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      },
    });
    return this.findOne(id, { includeDocuments: true });
  }

  async updateDocument(
    id: string,
    documentId: string,
    updates: { documentType?: string; expiryDate?: string | null; notes?: string | null },
  ) {
    await this.findOne(id);
    const doc = await this.prisma.employeeDocument.findUnique({ where: { id: documentId } });
    if (!doc || doc.employeeId !== id) throw new NotFoundException('Document not found');
    await this.prisma.employeeDocument.update({
      where: { id: documentId },
      data: {
        documentType: updates.documentType,
        notes: updates.notes === undefined ? undefined : updates.notes === null ? null : updates.notes,
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
  // Everyone's birthday within the next `days` days (today included),
  // sorted soonest-first. Compared by month/day only — the year in
  // dateOfBirth never matters here.
  async upcomingBirthdays(days: number) {
    const employees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE', dateOfBirth: { not: null } },
      select: { id: true, fullName: true, photoUrl: true, dateOfBirth: true },
    });
    const today = new Date();
    const startOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    return employees
      .map((e) => {
        const dob = e.dateOfBirth as unknown as Date;
        let next = Date.UTC(today.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate());
        if (next < startOfToday) next = Date.UTC(today.getUTCFullYear() + 1, dob.getUTCMonth(), dob.getUTCDate());
        const daysUntil = Math.round((next - startOfToday) / 86400000);
        return { id: e.id, fullName: e.fullName, photoUrl: e.photoUrl, daysUntil };
      })
      .filter((e) => e.daysUntil <= days)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }

  findAllDocuments() {
    return this.prisma.employeeDocument.findMany({
      include: {
        employee: {
          select: { id: true, fullName: true, photoUrl: true, employeeCode: true, designation: { select: { name: true } } },
        },
      },
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
