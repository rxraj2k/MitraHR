import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

// "STAFF" = password-login account (Admin today; HR/Manager/IT Support once
// multi-admin invites need finer-grained roles) — sub is a User id.
// "EMPLOYEE" = OTP-login session — sub is an Employee id, role is that
// employee's systemRole (defaults to EMPLOYEE), used for read-only access.
export type SessionKind = 'STAFF' | 'EMPLOYEE';

export interface JwtPayload {
  sub: string;
  kind: SessionKind;
  email: string;
  role: string;
  name: string;
  // Set for STAFF sessions whose User is linked to an Employee record
  // (e.g. an Admin who is also staff on the org chart) — lets them use
  // employee-facing features like "My Leave" for their own record.
  employeeId?: string | null;
  // The UserSession row this token belongs to (see schema.prisma) — checked
  // below on every request so "Force End Session" in the Admin Center's
  // Live User Activity panel actually revokes access immediately, not just
  // hides a row. Optional so a token issued before this existed (there
  // shouldn't be any live ones, but just in case) still authenticates.
  sid?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-change-me',
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.sid) {
      const session = await this.prisma.userSession.findUnique({ where: { sessionId: payload.sid } });
      if (!session || session.revoked) {
        throw new UnauthorizedException('This session has been ended. Please log in again.');
      }
    }
    return payload;
  }
}
