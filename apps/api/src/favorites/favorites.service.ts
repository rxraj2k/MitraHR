import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Lets an employee star colleagues for quick access on the Department
// Directory tab (Organization > Department Directory).
@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  listMine(employeeId: string) {
    return this.prisma.favoriteColleague.findMany({
      where: { employeeId },
      include: { favoriteEmployee: { include: { department: true, designation: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(employeeId: string, favoriteEmployeeId: string) {
    if (employeeId === favoriteEmployeeId) throw new BadRequestException("You can't favorite yourself");
    await this.prisma.favoriteColleague.upsert({
      where: { employeeId_favoriteEmployeeId: { employeeId, favoriteEmployeeId } },
      create: { employeeId, favoriteEmployeeId },
      update: {},
    });
    return { success: true };
  }

  async remove(employeeId: string, favoriteEmployeeId: string) {
    await this.prisma.favoriteColleague.deleteMany({ where: { employeeId, favoriteEmployeeId } });
    return { success: true };
  }
}
