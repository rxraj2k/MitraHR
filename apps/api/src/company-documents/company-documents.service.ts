import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompanyDocumentsService {
  constructor(private prisma: PrismaService) {}

  // Enriches every requiresAcknowledgment document with acknowledgment
  // stats (how many active employees have acknowledged it, and whether the
  // viewer themselves has) — cheap even at this app's scale since it's one
  // groupBy plus one lookup for the viewer's own acknowledgments, not a
  // per-document query. Documents not flagged for acknowledgment get null
  // for all three fields. The flag defaults on at upload for POLICY-category
  // documents but is a per-document toggle, not tied to category.
  async findAll(viewerEmployeeId: string | null) {
    const docs = await this.prisma.companyDocument.findMany({ orderBy: { uploadedAt: 'desc' } });
    const ackIds = docs.filter((d) => d.requiresAcknowledgment).map((d) => d.id);

    if (ackIds.length === 0) {
      return docs.map((d) => ({ ...d, acknowledgedByMe: null, acknowledgedCount: null, eligibleCount: null }));
    }

    const [counts, mine, eligibleCount] = await Promise.all([
      this.prisma.companyDocumentAcknowledgment.groupBy({
        by: ['companyDocumentId'],
        where: { companyDocumentId: { in: ackIds } },
        _count: { companyDocumentId: true },
      }),
      viewerEmployeeId
        ? this.prisma.companyDocumentAcknowledgment.findMany({
            where: { employeeId: viewerEmployeeId, companyDocumentId: { in: ackIds } },
            select: { companyDocumentId: true },
          })
        : Promise.resolve([]),
      this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
    ]);
    const countMap = new Map(counts.map((c) => [c.companyDocumentId, c._count.companyDocumentId]));
    const mineSet = new Set(mine.map((m) => m.companyDocumentId));

    return docs.map((d) =>
      d.requiresAcknowledgment
        ? {
            ...d,
            acknowledgedByMe: viewerEmployeeId ? mineSet.has(d.id) : null,
            acknowledgedCount: countMap.get(d.id) || 0,
            eligibleCount,
          }
        : { ...d, acknowledgedByMe: null, acknowledgedCount: null, eligibleCount: null },
    );
  }

  async findOne(id: string) {
    const doc = await this.prisma.companyDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  create(
    category: string,
    title: string,
    fileName: string,
    fileUrl: string,
    fileSize?: number,
    requiresAcknowledgment = false,
    description?: string,
  ) {
    return this.prisma.companyDocument.create({
      data: { category, title, fileName, fileUrl, fileSize, requiresAcknowledgment, description },
    });
  }

  async update(
    id: string,
    updates: { category?: string; title?: string; description?: string; requiresAcknowledgment?: boolean },
  ) {
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

  // Idempotent — acknowledging twice is a no-op, matching RecognitionLike's
  // upsert-based like/unlike precedent (Sprint 15).
  async acknowledge(companyDocumentId: string, employeeId: string) {
    await this.findOne(companyDocumentId);
    await this.prisma.companyDocumentAcknowledgment.upsert({
      where: { companyDocumentId_employeeId: { companyDocumentId, employeeId } },
      create: { companyDocumentId, employeeId },
      update: {},
    });
    return { success: true };
  }

  // Staff-only compliance view: who has and hasn't signed off on a policy.
  async getAcknowledgmentStatus(companyDocumentId: string) {
    await this.findOne(companyDocumentId);
    const [acknowledged, allActive] = await Promise.all([
      this.prisma.companyDocumentAcknowledgment.findMany({
        where: { companyDocumentId },
        include: { employee: { select: { id: true, fullName: true, employeeCode: true, photoUrl: true } } },
        orderBy: { acknowledgedAt: 'asc' },
      }),
      this.prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, fullName: true, employeeCode: true, photoUrl: true },
        orderBy: { fullName: 'asc' },
      }),
    ]);
    const acknowledgedIds = new Set(acknowledged.map((a) => a.employeeId));
    return {
      acknowledged: acknowledged.map((a) => ({ employee: a.employee, acknowledgedAt: a.acknowledgedAt })),
      pending: allActive.filter((e) => !acknowledgedIds.has(e.id)),
    };
  }
}
