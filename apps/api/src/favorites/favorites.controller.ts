import { Controller, Delete, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FavoritesService } from './favorites.service';

// Same "resolve whichever session kind this is" pattern used across the
// app — see announcements.controller.ts's resolveEmployeeId for the twin.
function resolveEmployeeId(user: any): string {
  const id = user.kind === 'EMPLOYEE' ? user.sub : user.employeeId;
  if (!id) throw new ForbiddenException('This action requires an employee record linked to your account');
  return id;
}

@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private service: FavoritesService) {}

  @Get()
  listMine(@Req() req: any) {
    return this.service.listMine(resolveEmployeeId(req.user));
  }

  @Post(':employeeId')
  add(@Req() req: any, @Param('employeeId') employeeId: string) {
    return this.service.add(resolveEmployeeId(req.user), employeeId);
  }

  @Delete(':employeeId')
  remove(@Req() req: any, @Param('employeeId') employeeId: string) {
    return this.service.remove(resolveEmployeeId(req.user), employeeId);
  }
}
