import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 30;
const OTP_MAX_ATTEMPTS = 5;
const INVITE_TTL_DAYS = 7;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  // --- Staff (password) login — Admin today; HR/Manager/IT Support once
  // multi-admin invites need finer-grained roles. ---

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid email or password');
    if (!user.passwordHash) {
      throw new UnauthorizedException('This account has not set a password yet — check your invite email');
    }
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Invalid email or password');
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const payload = {
      sub: user.id,
      kind: 'STAFF' as const,
      email: user.email,
      role: user.role,
      name: user.name,
      employeeId: user.employeeId ?? null,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        kind: 'STAFF' as const,
        employeeId: user.employeeId ?? null,
      },
    };
  }

  // --- Multi-admin invites — an existing admin adds a new one by email;
  // they get a "set your password" link instead of a shared password. ---

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private appUrl() {
    return process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
  }

  async inviteAdmin(name: string, email: string, employeeId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && existing.passwordHash) {
      throw new BadRequestException('An active account with this email already exists');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const inviteTokenHash = this.hashToken(token);
    const inviteTokenExpiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: { name, inviteTokenHash, inviteTokenExpiresAt, employeeId: employeeId || null },
        })
      : await this.prisma.user.create({
          data: {
            name,
            email,
            role: 'ADMIN',
            passwordHash: null,
            inviteTokenHash,
            inviteTokenExpiresAt,
            employeeId: employeeId || null,
          },
        });

    const link = `${this.appUrl()}/set-password?token=${token}`;
    await this.mailService.sendMail({
      to: email,
      subject: "You've been added as an admin on MitraHR",
      text: `Hi ${name},\n\nYou've been added as an admin on MitraHR. Set your password to activate your account:\n\n${link}\n\nThis link expires in ${INVITE_TTL_DAYS} days. If you weren't expecting this, you can ignore it.`,
    });

    return { id: user.id, name: user.name, email: user.email, role: user.role, status: 'INVITED' as const };
  }

  async setPassword(token: string, password: string) {
    const inviteTokenHash = this.hashToken(token);
    const user = await this.prisma.user.findUnique({ where: { inviteTokenHash } });
    if (!user || !user.inviteTokenExpiresAt || user.inviteTokenExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('This invite link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, inviteTokenHash: null, inviteTokenExpiresAt: null },
    });

    const payload = {
      sub: updated.id,
      kind: 'STAFF' as const,
      email: updated.email,
      role: updated.role,
      name: updated.name,
      employeeId: updated.employeeId ?? null,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        kind: 'STAFF' as const,
        employeeId: updated.employeeId ?? null,
      },
    };
  }

  async listAdmins() {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.passwordHash ? ('ACTIVE' as const) : ('INVITED' as const),
      employeeId: u.employeeId ?? null,
      createdAt: u.createdAt,
    }));
  }

  // --- Employee OTP login — no password; read-only access scoped to the
  // matching Employee record. ---

  private hashOtp(code: string) {
    return crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'dev-secret-change-me')
      .update(code)
      .digest('hex');
  }

  // Always returns the same generic message, whether or not the email
  // matches an employee, so this endpoint can't be used to fish for which
  // addresses are registered.
  private static readonly GENERIC_OTP_RESPONSE = {
    message: 'If that email is on file, a login code has been sent to it.',
  };

  async requestEmployeeOtp(email: string) {
    const employee = await this.prisma.employee.findUnique({ where: { email } });
    if (!employee) {
      return AuthService.GENERIC_OTP_RESPONSE;
    }

    const recent = await this.prisma.employeeOtp.findFirst({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
    });
    const cooldownActive =
      recent && !recent.consumedAt && recent.createdAt.getTime() > Date.now() - OTP_RESEND_COOLDOWN_SECONDS * 1000;
    if (cooldownActive) {
      return AuthService.GENERIC_OTP_RESPONSE;
    }

    await this.prisma.employeeOtp.deleteMany({ where: { employeeId: employee.id, consumedAt: null } });

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.employeeOtp.create({
      data: {
        employeeId: employee.id,
        codeHash: this.hashOtp(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      },
    });

    await this.mailService.sendMail({
      to: employee.email,
      subject: 'Your MitraHR login code',
      text: `Your login code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
    });

    return AuthService.GENERIC_OTP_RESPONSE;
  }

  async verifyEmployeeOtp(email: string, code: string) {
    const invalid = () => new UnauthorizedException('Invalid or expired code');
    const employee = await this.prisma.employee.findUnique({ where: { email } });
    if (!employee) throw invalid();

    const otp = await this.prisma.employeeOtp.findFirst({
      where: { employeeId: employee.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.expiresAt.getTime() < Date.now()) throw invalid();
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('Too many attempts — request a new code');
    }
    if (otp.codeHash !== this.hashOtp(code)) {
      await this.prisma.employeeOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw invalid();
    }

    await this.prisma.employeeOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

    const role = employee.systemRole || 'EMPLOYEE';
    const payload = {
      sub: employee.id,
      kind: 'EMPLOYEE' as const,
      email: employee.email,
      role,
      name: employee.fullName,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: employee.id, email: employee.email, name: employee.fullName, role, kind: 'EMPLOYEE' as const },
    };
  }
}
