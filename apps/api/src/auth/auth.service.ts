import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 30;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  // --- Staff (password) login — Admin today; HR/Manager/IT Support once
  // multi-admin invites exist. ---

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid email or password');
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Invalid email or password');
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const payload = { sub: user.id, kind: 'STAFF' as const, email: user.email, role: user.role, name: user.name };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, name: user.name, role: user.role, kind: 'STAFF' as const },
    };
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
