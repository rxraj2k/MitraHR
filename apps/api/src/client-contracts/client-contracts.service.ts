import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateClientContractInput {
  clientId: string;
  title: string;
  contractType?: string;
  startDate?: string;
  endDate?: string;
  value?: string;
  status?: string;
  notes?: string;
  fileName?: string;
  fileUrl?: string;
}

export interface UpdateClientContractInput {
  title?: string;
  contractType?: string;
  startDate?: string;
  endDate?: string;
  value?: string;
  status?: string;
  notes?: string;
}

@Injectable()
export class ClientContractsService {
  constructor(private prisma: PrismaService) {}

  findAll(clientId?: string) {
    return this.prisma.clientContract.findMany({
      where: { clientId: clientId || undefined },
      include: { client: { select: { id: true, name: true } } },
      orderBy: [{ endDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const contract = await this.prisma.clientContract.findUnique({
      where: { id },
      include: { client: { select: { id: true, name: true } } },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  async create(input: CreateClientContractInput) {
    const client = await this.prisma.client.findUnique({ where: { id: input.clientId } });
    if (!client) throw new BadRequestException('Invalid client');
    return this.prisma.clientContract.create({
      data: {
        clientId: input.clientId,
        title: input.title,
        contractType: input.contractType || undefined,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        value: input.value || undefined,
        status: input.status || undefined,
        notes: input.notes || undefined,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
      },
      include: { client: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, input: UpdateClientContractInput) {
    await this.findOne(id);
    return this.prisma.clientContract.update({
      where: { id },
      data: {
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      },
      include: { client: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.clientContract.delete({ where: { id } });
    return { success: true };
  }

  // Same root-relative-fileUrl trick as CompanyDocumentsService.getFile.
  async getFile(id: string) {
    const contract = await this.findOne(id);
    if (!contract.fileUrl) throw new NotFoundException('No file attached to this contract');
    return { path: join(process.cwd(), contract.fileUrl.replace(/^\//, '')), fileName: contract.fileName || 'contract' };
  }
}
