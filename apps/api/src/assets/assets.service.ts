import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const EMPLOYEE_REF_SELECT = { id: true, fullName: true, employeeCode: true, photoUrl: true };

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // List view: each asset carries its currently-open assignment (if any)
  // so the table can show the current holder without a second call.
  findAll(filters: { category?: string; status?: string }) {
    return this.prisma.asset.findMany({
      where: { category: filters.category || undefined, status: filters.status || undefined },
      include: {
        assignments: {
          where: { returnedAt: null },
          include: { employee: { select: EMPLOYEE_REF_SELECT } },
        },
      },
      orderBy: { assetTag: 'asc' },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        assignments: {
          include: { employee: { select: EMPLOYEE_REF_SELECT } },
          orderBy: [{ returnedAt: 'asc' }, { assignedAt: 'desc' }],
        },
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async create(input: { assetTag: string; category: string; name: string; serialNumber?: string; purchaseDate?: string; notes?: string }) {
    const clash = await this.prisma.asset.findUnique({ where: { assetTag: input.assetTag } });
    if (clash) throw new BadRequestException('An asset with this tag already exists');
    return this.prisma.asset.create({
      data: {
        assetTag: input.assetTag,
        category: input.category,
        name: input.name,
        serialNumber: input.serialNumber || undefined,
        purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : undefined,
        notes: input.notes || undefined,
      },
    });
  }

  async update(
    id: string,
    input: { assetTag?: string; category?: string; name?: string; serialNumber?: string; purchaseDate?: string; notes?: string },
  ) {
    const existing = await this.prisma.asset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Asset not found');
    if (input.assetTag && input.assetTag !== existing.assetTag) {
      const clash = await this.prisma.asset.findUnique({ where: { assetTag: input.assetTag } });
      if (clash) throw new BadRequestException('An asset with this tag already exists');
    }
    return this.prisma.asset.update({
      where: { id },
      data: {
        assetTag: input.assetTag,
        category: input.category,
        name: input.name,
        serialNumber: input.serialNumber === '' ? null : input.serialNumber,
        purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : input.purchaseDate === '' ? null : undefined,
        notes: input.notes === '' ? null : input.notes,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.asset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Asset not found');
    const historyCount = await this.prisma.assetAssignment.count({ where: { assetId: id } });
    if (historyCount > 0) {
      throw new BadRequestException('This asset has assignment history — mark it Retired or Lost instead of deleting it');
    }
    await this.prisma.asset.delete({ where: { id } });
    return { success: true };
  }

  // Hands an available asset to an employee, opening a new assignment and
  // flipping the asset to ASSIGNED in one transaction.
  async assign(id: string, input: { employeeId: string; conditionAtAssignment?: string }) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.status !== 'AVAILABLE') {
      throw new BadRequestException('Only an available asset can be assigned — return or free it up first');
    }
    const employee = await this.prisma.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee) throw new BadRequestException('Invalid employee');
    const [assignment] = await this.prisma.$transaction([
      this.prisma.assetAssignment.create({
        data: {
          assetId: id,
          employeeId: input.employeeId,
          conditionAtAssignment: input.conditionAtAssignment || 'GOOD',
        },
        include: { employee: { select: EMPLOYEE_REF_SELECT } },
      }),
      this.prisma.asset.update({ where: { id }, data: { status: 'ASSIGNED' } }),
    ]);
    await this.notifications.notifyEmployee(input.employeeId, {
      type: 'ASSET_ASSIGNED',
      title: `${asset.name} (${asset.assetTag}) was assigned to you`,
      employeeLink: '/',
      staffLink: '/assets',
    });
    return assignment;
  }

  // Closes out the asset's currently-open assignment and puts the asset
  // back into circulation (or wherever the hand-back condition warrants).
  async return(id: string, input: { conditionAtReturn?: string; returnNotes?: string; resultingStatus?: string }) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    const open = await this.prisma.assetAssignment.findFirst({ where: { assetId: id, returnedAt: null } });
    if (!open) throw new BadRequestException('This asset is not currently assigned to anyone');
    const [assignment] = await this.prisma.$transaction([
      this.prisma.assetAssignment.update({
        where: { id: open.id },
        data: {
          returnedAt: new Date(),
          conditionAtReturn: input.conditionAtReturn,
          returnNotes: input.returnNotes,
        },
        include: { employee: { select: EMPLOYEE_REF_SELECT } },
      }),
      this.prisma.asset.update({ where: { id }, data: { status: input.resultingStatus || 'AVAILABLE' } }),
    ]);
    return assignment;
  }

  // Direct correction for an asset with no current holder (e.g. marking a
  // spare Retired, or bringing one back from repair). ASSIGNED is
  // rejected here — that must go through assign() so a holder is recorded.
  async setStatus(id: string, status: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    const open = await this.prisma.assetAssignment.findFirst({ where: { assetId: id, returnedAt: null } });
    if (open) throw new BadRequestException('This asset is currently assigned — return it first');
    return this.prisma.asset.update({ where: { id }, data: { status } });
  }

  // Scoped view for an employee's own "My Assets" — current + past
  // hand-outs, most recent/still-open first.
  findForEmployee(employeeId: string) {
    return this.prisma.assetAssignment.findMany({
      where: { employeeId },
      include: { asset: true },
      orderBy: [{ returnedAt: 'asc' }, { assignedAt: 'desc' }],
    });
  }
}
