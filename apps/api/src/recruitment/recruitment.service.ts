import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobOpeningDto } from './dto/create-job-opening.dto';
import { UpdateJobOpeningDto } from './dto/update-job-opening.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { ConvertCandidateDto } from './dto/convert-candidate.dto';

const JOB_OPENING_INCLUDE = {
  department: { select: { id: true, name: true } },
  project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
  hiringManager: { select: { id: true, fullName: true, employeeCode: true } },
  technologies: { select: { id: true, name: true } },
  _count: { select: { candidates: true } },
};

const CANDIDATE_INCLUDE = {
  jobOpening: { select: { id: true, title: true, refCode: true, departmentId: true } },
};

const CANDIDATE_ORDER_BY = [{ appliedAt: 'desc' as const }];

const JOB_OPENING_REF_PREFIX = 'REC-';
const JOB_OPENING_REF_PAD = 4;

// Same code-generation shape as EmployeesService.nextEmployeeCode — a
// different Counter row ('jobOpeningRefCode') so requisition numbers and
// employee codes each have their own sequence.
const EMPLOYEE_CODE_PREFIX = 'OM-';
const EMPLOYEE_CODE_PAD = 4;

export interface CreateCandidateInput {
  jobOpeningId: string;
  fullName: string;
  email?: string;
  phone?: string;
  source?: string;
  roleTrack?: string;
  resumeFileName?: string;
  resumeUrl?: string;
}

@Injectable()
export class RecruitmentService {
  constructor(private prisma: PrismaService) {}

  private async nextJobOpeningRefCode(): Promise<string> {
    const counter = await this.prisma.counter.upsert({
      where: { name: 'jobOpeningRefCode' },
      update: { value: { increment: 1 } },
      create: { name: 'jobOpeningRefCode', value: 1 },
    });
    return `${JOB_OPENING_REF_PREFIX}${String(counter.value).padStart(JOB_OPENING_REF_PAD, '0')}`;
  }

  // Duplicated from EmployeesService rather than injected across modules —
  // this codebase's modules talk to Prisma directly rather than each
  // other's services (see e.g. EmployeeExitsService validating employees by
  // querying prisma.employee directly, not calling EmployeesService).
  private async nextEmployeeCode(): Promise<string> {
    const counter = await this.prisma.counter.upsert({
      where: { name: 'employeeCode' },
      update: { value: { increment: 1 } },
      create: { name: 'employeeCode', value: 1 },
    });
    return `${EMPLOYEE_CODE_PREFIX}${String(counter.value).padStart(EMPLOYEE_CODE_PAD, '0')}`;
  }

  // --- Job Openings ------------------------------------------------------

  findAllOpenings(status?: string) {
    return this.prisma.jobOpening.findMany({
      where: { status: status || undefined },
      include: JOB_OPENING_INCLUDE,
      orderBy: [{ status: 'asc' }, { openedAt: 'desc' }],
    });
  }

  async findOneOpening(id: string) {
    const opening = await this.prisma.jobOpening.findUnique({
      where: { id },
      include: JOB_OPENING_INCLUDE,
    });
    if (!opening) throw new NotFoundException('Job opening not found');
    return opening;
  }

  async createOpening(dto: CreateJobOpeningDto) {
    const refCode = await this.nextJobOpeningRefCode();
    return this.prisma.jobOpening.create({
      data: {
        refCode,
        title: dto.title,
        departmentId: dto.departmentId || undefined,
        projectId: dto.projectId || undefined,
        hiringManagerId: dto.hiringManagerId || undefined,
        technologies: dto.technologyIds?.length ? { connect: dto.technologyIds.map((id) => ({ id })) } : undefined,
        employmentType: dto.employmentType || undefined,
        experienceLevel: dto.experienceLevel || undefined,
        salaryRange: dto.salaryRange || undefined,
        headcountTarget: dto.headcountTarget || undefined,
        description: dto.description || undefined,
        status: dto.status || undefined,
      },
      include: JOB_OPENING_INCLUDE,
    });
  }

  async updateOpening(id: string, dto: UpdateJobOpeningDto) {
    const existing = await this.findOneOpening(id);
    // Closing an opening (from any other status) stamps closedAt; reopening
    // it (back to OPEN/ON_HOLD) clears it — same "derive the timestamp from
    // the status transition" pattern as EmployeeExit.completedAt.
    const closedAt =
      dto.status === 'CLOSED' && existing.status !== 'CLOSED'
        ? new Date()
        : dto.status && dto.status !== 'CLOSED'
        ? null
        : undefined;
    return this.prisma.jobOpening.update({
      where: { id },
      data: {
        title: dto.title,
        departmentId: dto.departmentId,
        projectId: dto.projectId,
        hiringManagerId: dto.hiringManagerId,
        // `set` replaces the full tag list with whatever the client sent —
        // simplest correct semantics for a multi-select tag input.
        technologies: dto.technologyIds ? { set: dto.technologyIds.map((tid) => ({ id: tid })) } : undefined,
        employmentType: dto.employmentType,
        experienceLevel: dto.experienceLevel,
        salaryRange: dto.salaryRange,
        headcountTarget: dto.headcountTarget,
        description: dto.description,
        status: dto.status,
        closedAt,
      },
      include: JOB_OPENING_INCLUDE,
    });
  }

  async removeOpening(id: string) {
    await this.findOneOpening(id);
    await this.prisma.jobOpening.delete({ where: { id } });
    return { success: true };
  }

  // --- Candidates ----------------------------------------------------------

  findCandidates(jobOpeningId?: string, stage?: string) {
    return this.prisma.candidate.findMany({
      where: { jobOpeningId: jobOpeningId || undefined, stage: stage || undefined },
      include: CANDIDATE_INCLUDE,
      orderBy: CANDIDATE_ORDER_BY,
    });
  }

  async findOneCandidate(id: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: CANDIDATE_INCLUDE,
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    return candidate;
  }

  async createCandidate(input: CreateCandidateInput) {
    const opening = await this.prisma.jobOpening.findUnique({ where: { id: input.jobOpeningId } });
    if (!opening) throw new BadRequestException('Invalid job opening');
    return this.prisma.candidate.create({
      data: {
        jobOpeningId: input.jobOpeningId,
        fullName: input.fullName,
        email: input.email || undefined,
        phone: input.phone || undefined,
        source: input.source || undefined,
        roleTrack: input.roleTrack || undefined,
        resumeFileName: input.resumeFileName,
        resumeUrl: input.resumeUrl,
      },
      include: CANDIDATE_INCLUDE,
    });
  }

  async updateCandidate(id: string, dto: UpdateCandidateDto) {
    const existing = await this.findOneCandidate(id);
    // hiredAt is derived server-side from the stage transition, same as
    // JobOpening.closedAt above and EmployeeExit.completedAt elsewhere —
    // never trust a client-supplied timestamp for "when did this happen".
    const hiredAt =
      dto.stage === 'HIRED' && existing.stage !== 'HIRED'
        ? new Date()
        : dto.stage && dto.stage !== 'HIRED'
        ? null
        : undefined;
    // A rejection reason only makes sense once actually rejected; clear any
    // stale reason if a rejected candidate gets moved back into the pipeline.
    const rejectionReason =
      dto.stage && dto.stage !== 'REJECTED' && existing.stage === 'REJECTED' && dto.rejectionReason === undefined
        ? null
        : dto.rejectionReason;
    return this.prisma.candidate.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        source: dto.source,
        roleTrack: dto.roleTrack,
        stage: dto.stage,
        screeningNotes: dto.screeningNotes,
        screeningRating: dto.screeningRating,
        technicalNotes: dto.technicalNotes,
        technicalRating: dto.technicalRating,
        finalRoundNotes: dto.finalRoundNotes,
        finalRoundRating: dto.finalRoundRating,
        hrRoundNotes: dto.hrRoundNotes,
        hrRoundRating: dto.hrRoundRating,
        nextInterviewAt: dto.nextInterviewAt ? new Date(dto.nextInterviewAt) : undefined,
        rejectionReason,
        hiredAt,
      },
      include: CANDIDATE_INCLUDE,
    });
  }

  async removeCandidate(id: string) {
    await this.findOneCandidate(id);
    await this.prisma.candidate.delete({ where: { id } });
    return { success: true };
  }

  // "Offer & Convert to Employee" — creates a real Employee record (same
  // code-generation sequence as adding one through Employees directly),
  // links it back onto the candidate, and flips the candidate to HIRED in
  // one transaction. Deliberately a thin bridge rather than a duplicate
  // onboarding flow: only the fields CreateEmployeeDto actually requires.
  async convertToEmployee(id: string, dto: ConvertCandidateDto) {
    const candidate = await this.findOneCandidate(id);
    if (candidate.convertedEmployeeId) {
      throw new BadRequestException('This candidate has already been converted to an employee');
    }
    const employeeCode = await this.nextEmployeeCode();
    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          employeeCode,
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone || undefined,
          employmentType: dto.employmentType,
          departmentId: dto.departmentId || candidate.jobOpening.departmentId || undefined,
          dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : undefined,
        },
      });
      return tx.candidate.update({
        where: { id },
        data: { stage: 'HIRED', hiredAt: new Date(), convertedEmployeeId: employee.id },
        include: { ...CANDIDATE_INCLUDE, convertedEmployee: { select: { id: true, fullName: true, employeeCode: true } } },
      });
    });
  }

  // Same root-relative-fileUrl trick as ClientContractsService.getFile /
  // CompanyDocumentsService.getFile.
  async getResumeFile(id: string) {
    const candidate = await this.findOneCandidate(id);
    if (!candidate.resumeUrl) throw new NotFoundException('No resume attached to this candidate');
    return {
      path: join(process.cwd(), candidate.resumeUrl.replace(/^\//, '')),
      fileName: candidate.resumeFileName || 'resume',
    };
  }
}
