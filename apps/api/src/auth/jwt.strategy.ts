import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// "STAFF" = password-login account (Admin today; HR/Manager/IT Support once
// multi-admin invites land) — sub is a User id.
// "EMPLOYEE" = OTP-login session — sub is an Employee id, role is that
// employee's systemRole (defaults to EMPLOYEE), used for read-only access.
export type SessionKind = 'STAFF' | 'EMPLOYEE';

export interface JwtPayload {
  sub: string;
  kind: SessionKind;
  email: string;
  role: string;
  name: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-change-me',
    });
  }

  async validate(payload: JwtPayload) {
    return payload;
  }
}
