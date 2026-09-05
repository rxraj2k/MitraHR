import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

// Blocks OTP-logged-in employees from hitting endpoints meant only for
// password-login staff (Admin today; HR/Manager/IT Support once multi-admin
// invites exist). Always pair with JwtAuthGuard (this only checks `kind` on
// an already-authenticated req.user, it doesn't verify the token itself).
@Injectable()
export class StaffOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.user?.kind !== 'STAFF') {
      throw new ForbiddenException('This action is only available to staff accounts');
    }
    return true;
  }
}
