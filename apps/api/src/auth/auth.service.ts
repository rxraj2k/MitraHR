import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditActor, auditEntry, describeUserAgent } from '../audit/audit.util';

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
    private notifications: NotificationsService,
  ) {}

  // The linked Employee's photo (when there is one) so the header profile
  // menu can show a real photo instead of always falling back to initials
  // -- an EMPLOYEE session's photo is its own record; a STAFF session only
  // has one if that admin has been linked to an Employee record.
  async getMe(sessionUser: { sub: string; kind: 'STAFF' | 'EMPLOYEE'; email: string; name: string; role: string; employeeId?: string | null }) {
    const employeeId = sessionUser.kind === 'EMPLOYEE' ? sessionUser.sub : sessionUser.employeeId ?? null;
    const employee = employeeId
      ? await this.prisma.employee.findUnique({
          where: { id: employeeId },
          select: {
            photoUrl: true,
            presenceStatus: true,
            emailOnLeaveDecision: true,
            emailOnAnnouncement: true,
            emailOnAssessmentResult: true,
            emailOnBirthday: true,
            emailOnAppraisal: true,
          },
        })
      : null;
    // A STAFF session's presence lives on its own User row -- it's about
    // the login itself, not the (possibly absent) linked Employee record.
    const presenceStatus =
      sessionUser.kind === 'EMPLOYEE'
        ? employee?.presenceStatus ?? 'AVAILABLE'
        : (await this.prisma.user.findUnique({ where: { id: sessionUser.sub }, select: { presenceStatus: true } }))
            ?.presenceStatus ?? 'AVAILABLE';
    return {
      id: sessionUser.sub,
      kind: sessionUser.kind,
      email: sessionUser.email,
      name: sessionUser.name,
      role: sessionUser.role,
      employeeId,
      photoUrl: employee?.photoUrl ?? null,
      presenceStatus,
      // null (never a default-filled object) when there's no personal
      // Employee record to hold these against -- Account Settings shows an
      // honest "not applicable" state instead of toggles that would
      // silently do nothing for a pure admin-only login.
      notificationPreferences: employee
        ? {
            emailOnLeaveDecision: employee.emailOnLeaveDecision,
            emailOnAnnouncement: employee.emailOnAnnouncement,
            emailOnAssessmentResult: employee.emailOnAssessmentResult,
            emailOnBirthday: employee.emailOnBirthday,
            emailOnAppraisal: employee.emailOnAppraisal,
          }
        : null,
    };
  }

  async setPresence(sessionUser: { sub: string; kind: 'STAFF' | 'EMPLOYEE' }, status: string) {
    if (sessionUser.kind === 'EMPLOYEE') {
      await this.prisma.employee.update({ where: { id: sessionUser.sub }, data: { presenceStatus: status } });
    } else {
      await this.prisma.user.update({ where: { id: sessionUser.sub }, data: { presenceStatus: status } });
    }
    return { presenceStatus: status };
  }

  async updateNotificationPreferences(
    sessionUser: { sub: string; kind: 'STAFF' | 'EMPLOYEE'; employeeId?: string | null },
    prefs: Partial<{
      emailOnLeaveDecision: boolean;
      emailOnAnnouncement: boolean;
      emailOnAssessmentResult: boolean;
      emailOnBirthday: boolean;
      emailOnAppraisal: boolean;
    }>,
  ) {
    const employeeId = sessionUser.kind === 'EMPLOYEE' ? sessionUser.sub : sessionUser.employeeId ?? null;
    if (!employeeId) {
      throw new BadRequestException('This account has no linked employee record to hold notification preferences');
    }
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: prefs,
      select: {
        emailOnLeaveDecision: true,
        emailOnAnnouncement: true,
        emailOnAssessmentResult: true,
        emailOnBirthday: true,
        emailOnAppraisal: true,
      },
    });
  }

  // Self-service password change for a logged-in STAFF account -- an
  // EMPLOYEE (OTP) session has no password at all, so this route is
  // STAFF-only (enforced by the controller via req.user.kind). Requires the
  // current password (not just being logged in) since the JWT alone
  // shouldn't be enough to take over the account from an unattended
  // session.
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Account not found');
    if (!user.passwordHash) {
      throw new BadRequestException('This account has not set a password yet — check your invite email');
    }
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) throw new UnauthorizedException('Current password is incorrect');
    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { success: true };
  }

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

  async login(email: string, password: string, ip?: string | null, userAgent?: string | null) {
    const user = await this.validateUser(email, password);
    // Best-effort — never let a timestamp write block or fail a login.
    this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});
    const sid = await this.startSession('STAFF', user.id, user.name, user.email, user.role, ip, userAgent);
    const payload = {
      sub: user.id,
      kind: 'STAFF' as const,
      email: user.email,
      role: user.role,
      name: user.name,
      employeeId: user.employeeId ?? null,
      sid,
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

  // --- Live sessions (Admin Center > Data & System Health > Live User
  // Activity) -- a real row per login, not a fabricated "active sessions"
  // count. See UserSession's model comment for the full picture; startSession
  // is called from both login() and verifyEmployeeOtp() below, heartbeat()
  // is hit every ~60s by the frontend while a tab is open, and logout()
  // closes it out on an explicit sign-out. Every write here is best-effort
  // (.catch(() => {})) so a logging hiccup never blocks or breaks a login,
  // heartbeat, or logout for the person using the app.
  private async startSession(
    userKind: 'STAFF' | 'EMPLOYEE',
    userId: string,
    name: string,
    email: string,
    role: string,
    ip?: string | null,
    userAgent?: string | null,
  ): Promise<string> {
    // A "New Sign-In" toast only earns its keep when it tells you
    // something you don't already know -- your own ordinary daily login
    // isn't news to you. So this only fires when the account ALREADY has
    // another session that still counts as Active (the same idle-timeout
    // definition Live User Activity uses -- see AdminService) at the
    // moment this new one starts: someone/something is signing in while
    // you appear to already be using the account elsewhere.
    const settings = await this.prisma.adminSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
    const idleMs = (settings?.sessionIdleTimeoutMin ?? 30) * 60 * 1000;
    const existingActive = await this.prisma.userSession
      .findFirst({
        where: { userKind, userId, revoked: false, loggedOutAt: null, lastSeenAt: { gte: new Date(Date.now() - idleMs) } },
      })
      .catch(() => null);

    const sessionId = crypto.randomUUID();
    await this.prisma.userSession
      .create({ data: { sessionId, userKind, userId, name, email, role, ipAddress: ip || null, userAgent: userAgent || null } })
      .catch(() => {});

    if (existingActive) {
      this.notifications
        .notifySelf(userKind, userId, {
          type: 'NEW_LOGIN',
          title: 'New sign-in to your account',
          body: `${describeUserAgent(userAgent)}${ip ? ` • ${ip}` : ''} — while another session was already active.`,
        })
        .catch(() => {});
    }

    return sessionId;
  }

  async heartbeat(sessionId: string) {
    await this.prisma.userSession.update({ where: { sessionId }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }

  async endSession(sessionId: string) {
    await this.prisma.userSession.update({ where: { sessionId }, data: { loggedOutAt: new Date() } }).catch(() => {});
  }

  // --- Multi-admin invites — an existing admin adds a new one by email;
  // they get a "set your password" link instead of a shared password. ---

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private appUrl() {
    return process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
  }

  async inviteAdmin(actor: AuditActor, name: string, email: string, employeeId?: string, role?: string) {
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
          data: { name, inviteTokenHash, inviteTokenExpiresAt, employeeId: employeeId || null, role: role || existing.role },
        })
      : await this.prisma.user.create({
          data: {
            name,
            email,
            role: role || 'ADMIN',
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

    await this.prisma.auditLog
      .create({ data: auditEntry(actor, 'SECURITY', 'CREATE', `Invited ${name} (${email}) as ${user.role}`) })
      .catch(() => {});

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
      lastLoginAt: u.lastLoginAt ?? null,
    }));
  }

  // Links (or unlinks) an already-active admin account to an Employee
  // record after the fact. Invite-time linking (inviteAdmin above) only
  // covers brand-new admins; an admin account seeded straight into the DB,
  // or one invited before this existed, has no other way to pick up an
  // employeeId — and without one, staff-acting-as-themselves features
  // (kudos, announcements comments, "my leave") throw "requires an
  // employee record linked to your account".
  async updateAdminEmployeeLink(userId: string, employeeId: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Admin account not found');

    if (employeeId) {
      const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
      if (!employee) throw new BadRequestException('Employee not found');
      const alreadyLinked = await this.prisma.user.findUnique({ where: { employeeId } });
      if (alreadyLinked && alreadyLinked.id !== userId) {
        throw new BadRequestException(`${employee.fullName} is already linked to another admin account`);
      }
    }

    const updated = await this.prisma.user.update({ where: { id: userId }, data: { employeeId: employeeId || null } });
    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.passwordHash ? ('ACTIVE' as const) : ('INVITED' as const),
      employeeId: updated.employeeId ?? null,
      createdAt: updated.createdAt,
    };
  }

  // Roles & Permissions (minimal, Sprint 19 follow-up) — lets an existing
  // Admin change another staff account's role after the fact, the same way
  // updateAdminEmployeeLink lets one fix up the employee link after the
  // fact. Deliberately doesn't block someone from demoting themselves —
  // there's always at least the one seeded admin account, and re-promoting
  // is just as easy through this same endpoint by any other Admin.
  async updateAdminRole(actor: AuditActor, userId: string, role: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Admin account not found');
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { role } });
    await this.prisma.auditLog
      .create({
        data: auditEntry(actor, 'SECURITY', 'UPDATE', `Changed ${user.name}'s role from ${user.role} to ${role}`, {
          severity: 'WARNING',
        }),
      })
      .catch(() => {});
    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.passwordHash ? ('ACTIVE' as const) : ('INVITED' as const),
      employeeId: updated.employeeId ?? null,
      createdAt: updated.createdAt,
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

  async verifyEmployeeOtp(email: string, code: string, ip?: string | null, userAgent?: string | null) {
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
    const sid = await this.startSession('EMPLOYEE', employee.id, employee.fullName, employee.email, role, ip, userAgent);
    const payload = {
      sub: employee.id,
      kind: 'EMPLOYEE' as const,
      email: employee.email,
      role,
      name: employee.fullName,
      sid,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: employee.id, email: employee.email, name: employee.fullName, role, kind: 'EMPLOYEE' as const },
    };
  }
}
