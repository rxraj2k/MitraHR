import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// Stricter than StaffOnlyGuard: that one admits any password-login account
// (ADMIN/HR/MANAGER/IT_SUPPORT). This one is for the Admin Center's own
// governance surface -- inviting/role-changing other admins, security
// policy, audit logs, automations, backups -- which the spec restricts to
// "Administrator or Super Admin". This codebase's staff-role vocabulary
// only has 'ADMIN' as the top tier (see STAFF_ROLES in
// auth/dto/invite-admin.dto.ts) so that's what this checks; always pair
// with JwtAuthGuard, same as StaffOnlyGuard.
@Injectable()
export class AdminOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.user?.kind !== 'STAFF' || req.user?.role !== 'ADMIN') {
      throw new ForbiddenException('This action is only available to Administrator accounts');
    }
    return true;
  }
}
