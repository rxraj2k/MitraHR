import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAdminSettingsDto } from './dto/update-admin-settings.dto';
import { AuditActor, auditEntry, describeUserAgent } from '../audit/audit.util';

// A session with no heartbeat for longer than this drops off the Live User
// Activity list entirely rather than sitting there forever as a stale
// "Away" row -- this mirrors the "Recently Logged Out (last 24h)" framing
// the panel itself uses, so the whole table is scoped to "the last day",
// not the full lifetime of every login anyone's ever made.
const SESSION_LOOKBACK_MS = 24 * 60 * 60 * 1000;

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours < 24) return remMin ? `${hours}h ${remMin}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export interface AuditLogFilters {
  userQuery?: string;
  module?: string;
  action?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // --- Security & Automations settings (singleton row) -------------------

  // Upsert-on-read: the migration's seed INSERT already creates the
  // 'default' row, but this stays defensive for a DB restored from before
  // this feature existed, or any environment that skipped the seed.
  getSettings() {
    return this.prisma.adminSettings.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } });
  }

  updateSettings(dto: UpdateAdminSettingsDto) {
    return this.prisma.adminSettings.upsert({ where: { id: 'default' }, update: dto, create: { id: 'default', ...dto } });
  }

  // --- Audit Logs ----------------------------------------------------------

  private auditWhere(filters: AuditLogFilters) {
    const where: any = {};
    if (filters.module) where.module = filters.module;
    if (filters.action) where.action = filters.action;
    if (filters.userQuery) {
      where.OR = [
        { userName: { contains: filters.userQuery } },
        { userEmail: { contains: filters.userQuery } },
      ];
    }
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(`${filters.to}T23:59:59.999Z`);
    }
    return where;
  }

  listAuditLogs(filters: AuditLogFilters) {
    // Capped at 500 -- this is a review screen, not a paginated export;
    // use exportAuditLogsCsv (with the same filters) for the full set.
    return this.prisma.auditLog.findMany({ where: this.auditWhere(filters), orderBy: { createdAt: 'desc' }, take: 500 });
  }

  async exportAuditLogsCsv(filters: AuditLogFilters): Promise<string> {
    const rows = await this.prisma.auditLog.findMany({ where: this.auditWhere(filters), orderBy: { createdAt: 'desc' } });
    const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Timestamp', 'User', 'Email', 'Module', 'Action', 'Description', 'Severity', 'IP Address'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [r.createdAt.toISOString(), r.userName, r.userEmail, r.module, r.action, r.description, r.severity, r.ipAddress || '']
          .map((v) => escape(String(v)))
          .join(','),
      );
    }
    return lines.join('\n');
  }

  // --- System Health ---------------------------------------------------

  // A sqlite `file:` datasource URL (e.g. "file:./dev.db") is resolved by
  // Prisma relative to the schema file's own folder
  // (apps/api/prisma/schema.prisma) -- NOT relative to process.cwd(), and
  // NOT a fixed number of `__dirname` hops either (this project's tsc
  // output lands at dist/src/admin/... in a build vs. src/admin/... in
  // dev, since tsc's computed rootDir also covers apps/api/prisma/*.ts
  // seed scripts -- a __dirname-relative guess broke on that difference).
  // Both `nest start` (dev) and `node dist/main.js` (prod) are run with
  // apps/api as the working directory (the standard way to launch an
  // npm-workspace package, and the same directory `prisma
  // migrate`/`generate` are always run from) -- so process.cwd() +
  // 'prisma' reliably reaches it either way. Shared by the size check
  // below and by the real backup/restore flow, so there's exactly one
  // place that knows where the database file actually lives.
  private getDbPath(): string {
    const url = process.env.DATABASE_URL || '';
    const match = url.match(/^file:(.+)$/);
    if (!match) throw new Error('DATABASE_URL is not a sqlite file: URL');
    return path.resolve(process.cwd(), 'prisma', match[1]);
  }

  private getDbSizeBytes(): number | null {
    try {
      return fs.statSync(this.getDbPath()).size;
    } catch {
      return null;
    }
  }

  async getSystemHealth() {
    const [employeeCount, adminCount, auditLogCount, recentLogins, settings] = await Promise.all([
      this.prisma.employee.count(),
      this.prisma.user.count(),
      this.prisma.auditLog.count(),
      this.prisma.user.count({ where: { lastLoginAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      this.getSettings(),
    ]);
    return {
      employeeCount,
      adminCount,
      auditLogCount,
      dbSizeBytes: this.getDbSizeBytes(),
      recentLogins24h: recentLogins,
      backupSchedule: settings.backupSchedule,
      lastBackupAt: settings.lastBackupAt,
    };
  }

  // --- Backup & Restore ----------------------------------------------------
  //
  // A real, full-database file backup/restore -- not a partial JSON export
  // of a handful of tables (that's what this replaced; it only ever
  // covered 9 of the app's ~60 tables, so it could never have been used to
  // actually put the app back together). Since this app runs on sqlite,
  // the database IS a single file, so a true, complete, exact-point-in-time
  // backup is just a copy of that file, and a true restore is swapping it
  // back in. The Daily/Weekly dropdown on this tab is still saved intent
  // only (see AdminSettings' model comment) -- this wires up the on-demand
  // button for real, not the scheduler.
  async getBackupFile(): Promise<{ path: string; fileName: string }> {
    const dbPath = this.getDbPath();
    if (!fs.existsSync(dbPath)) throw new NotFoundException('Database file not found');
    await this.prisma.adminSettings.upsert({
      where: { id: 'default' },
      update: { lastBackupAt: new Date() },
      create: { id: 'default', lastBackupAt: new Date() },
    });
    return { path: dbPath, fileName: `mitrahr-backup-${new Date().toISOString().slice(0, 10)}.db` };
  }

  // Restoring a live sqlite file out from under a running app is
  // inherently a little disruptive -- any request from another logged-in
  // person that happens to land in the brief window between disconnecting
  // and reconnecting Prisma below will fail and need retrying. There's no
  // request-queueing/maintenance-mode built for this; for a small
  // self-hosted app, a restore is a deliberate, rare admin action best
  // done when no one else is actively using it, not something worth a lot
  // of extra machinery to make perfectly seamless.
  //
  // The one thing this DOES guard against for real: restoring a backup
  // taken on an OLDER version of MitraHR, whose schema is missing tables
  // or columns the CURRENTLY RUNNING code expects (e.g. a backup from
  // before this very feature existed, with no UserSession table) --
  // silently swapping that in would leave the app half-broken with cryptic
  // "no such table" errors on the next request. So before touching the
  // real file, the upload is opened as its own throwaway PrismaClient and
  // its applied migration history is compared against this codebase's
  // prisma/migrations folder; anything the codebase expects that the
  // upload doesn't have blocks the restore with a clear reason instead.
  async restoreBackupFile(actor: AuditActor, uploadedFilePath: string): Promise<{ ok: true; restoredAt: string }> {
    try {
      const buffer = fs.readFileSync(uploadedFilePath);
      const header = buffer.subarray(0, 16).toString('utf8');
      if (header !== 'SQLite format 3\u0000') {
        throw new BadRequestException('That file is not a valid SQLite database backup.');
      }

      const migrationsDir = path.resolve(process.cwd(), 'prisma', 'migrations');
      const expectedMigrations = fs
        .readdirSync(migrationsDir)
        .filter((name) => fs.statSync(path.join(migrationsDir, name)).isDirectory());

      let uploadedMigrations: string[] = [];
      const probe = new PrismaClient({ datasources: { db: { url: `file:${uploadedFilePath}` } } });
      try {
        const rows = await probe.$queryRawUnsafe<{ migration_name: string }[]>(
          'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL',
        );
        uploadedMigrations = rows.map((r) => r.migration_name);
      } catch {
        throw new BadRequestException('Could not read this file as a MitraHR database backup.');
      } finally {
        await probe.$disconnect();
      }

      const missing = expectedMigrations.filter((m) => !uploadedMigrations.includes(m));
      if (missing.length > 0) {
        throw new BadRequestException(
          `This backup is from an older version of MitraHR and is missing ${missing.length} schema update(s) since it was taken (e.g. "${missing[0]}"). Restoring it would break the app running today -- only restore a backup taken on this same version.`,
        );
      }

      const dbPath = this.getDbPath();
      await this.prisma.$disconnect();
      try {
        for (const suffix of ['-wal', '-shm']) {
          const sidecar = dbPath + suffix;
          if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
        }
        fs.copyFileSync(uploadedFilePath, dbPath);
      } finally {
        await this.prisma.$connect();
      }

      await this.prisma.auditLog
        .create({
          data: auditEntry(actor, 'SYSTEM', 'UPDATE', 'Restored the database from an uploaded backup file', {
            severity: 'CRITICAL',
          }),
        })
        .catch(() => {});

      return { ok: true, restoredAt: new Date().toISOString() };
    } finally {
      fs.unlink(uploadedFilePath, () => {});
    }
  }

  // --- Live User Activity (Data & System Health) --------------------------
  //
  // Real per-login sessions (see UserSession's model comment), not a
  // fabricated "who's online" gauge. "Away" uses the same
  // sessionIdleTimeoutMin an admin already sets on Security & Authentication
  // -- that field used to be pure policy ("not yet enforced"); this is what
  // it now actually drives. The table itself is scoped to the last 24
  // hours (see SESSION_LOOKBACK_MS) so it stays a "what's happening lately"
  // view rather than growing forever.
  async getLiveActivity() {
    const settings = await this.getSettings();
    const idleMs = settings.sessionIdleTimeoutMin * 60 * 1000;
    const since = new Date(Date.now() - SESSION_LOOKBACK_MS);

    const sessions = await this.prisma.userSession.findMany({
      where: { OR: [{ lastSeenAt: { gte: since } }, { loggedOutAt: { gte: since } }] },
      orderBy: { lastSeenAt: 'desc' },
      take: 100,
    });

    const now = Date.now();
    let activeCount = 0;
    let awayCount = 0;
    let loggedOutCount24h = 0;

    const rows = sessions.map((s) => {
      const lastSeenMs = now - s.lastSeenAt.getTime();
      const ended = s.revoked || !!s.loggedOutAt;
      let status: 'ACTIVE' | 'AWAY' | 'LOGGED_OUT';
      let statusLabel: string;

      if (ended) {
        status = 'LOGGED_OUT';
        const endedAt = s.revoked ? s.revokedAt! : s.loggedOutAt!;
        statusLabel = s.revoked
          ? `Session ended by admin ${formatDuration(now - endedAt.getTime())} ago`
          : `Logged out ${formatDuration(now - endedAt.getTime())} ago`;
        if (endedAt.getTime() >= since.getTime()) loggedOutCount24h += 1;
      } else if (lastSeenMs <= idleMs) {
        status = 'ACTIVE';
        statusLabel = 'Active now';
        activeCount += 1;
      } else {
        status = 'AWAY';
        statusLabel = `Away (idle ${formatDuration(lastSeenMs)})`;
        awayCount += 1;
      }

      const endTime = s.revoked ? s.revokedAt! : s.loggedOutAt ? s.loggedOutAt : new Date();
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        role: s.role,
        userKind: s.userKind,
        status,
        statusLabel,
        ipAddress: s.ipAddress,
        device: describeUserAgent(s.userAgent),
        loginAt: s.loginAt,
        lastSeenAt: s.lastSeenAt,
        durationLabel: formatDuration(endTime.getTime() - s.loginAt.getTime()),
        canForceEnd: !ended,
      };
    });

    return {
      summary: { activeCount, awayCount, loggedOutCount24h, awayThresholdMin: settings.sessionIdleTimeoutMin },
      sessions: rows,
    };
  }

  async forceEndSession(actor: AuditActor, id: string) {
    const session = await this.prisma.userSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    if (!session.revoked && !session.loggedOutAt) {
      await this.prisma.userSession.update({
        where: { id },
        data: { revoked: true, revokedAt: new Date(), revokedByName: actor.name },
      });
      await this.prisma.auditLog
        .create({
          data: auditEntry(actor, 'SECURITY', 'UPDATE', `Force-ended ${session.name}'s session (${session.email})`, {
            severity: 'WARNING',
          }),
        })
        .catch(() => {});
    }
    return this.getLiveActivity();
  }
}
