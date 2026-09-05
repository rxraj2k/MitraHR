import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ReplaceSkillsDto } from './dto/replace-skills.dto';

const INCLUDE = {
  department: true,
  designation: true,
  reportingManager: {
    select: { id: true, fullName: true, employeeCode: true },
  },
  skills: { include: { skill: true } },
  documents: { orderBy: { uploadedAt: 'desc' as const } },
};

const EMPLOYEE_CODE_PREFIX = 'MITRA-';
const EMPLOYEE_CODE_PAD = 4;

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.employee.findMany({ orderBy: { fullName: 'asc' }, include: INCLUDE });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id }, include: INCLUDE });
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
      include: INCLUDE,
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
      include: INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.employee.delete({ where: { id } });
    return { success: true };
  }

  async setPhoto(id: string, photoUrl: string) {
    await this.findOne(id);
    return this.prisma.employee.update({ where: { id }, data: { photoUrl }, include: INCLUDE });
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

  async addDocument(id: string, documentType: string, fileName: string, fileUrl: string) {
    await this.findOne(id);
    await this.prisma.employeeDocument.create({
      data: { employeeId: id, documentType, fileName, fileUrl },
    });
    return this.findOne(id);
  }

  async removeDocument(id: string, documentId: string) {
    await this.findOne(id);
    const doc = await this.prisma.employeeDocument.findUnique({ where: { id: documentId } });
    if (!doc || doc.employeeId !== id) throw new NotFoundException('Document not found');
    await this.prisma.employeeDocument.delete({ where: { id: documentId } });
    return this.findOne(id);
  }
}
