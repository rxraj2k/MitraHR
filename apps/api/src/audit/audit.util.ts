// Shared shape-builder for AuditLog rows (Admin Center > System Audit
// Logs). Deliberately a plain function, not an injectable service -- every
// call site already has PrismaService injected, so this just saves each
// one from re-deriving the same {userId, userName, userEmail, ...} shape
// by hand. Every call site wraps the resulting `prisma.auditLog.create()`
// in `.catch(() => {})` (see call sites) so a logging failure never blocks
// the real action it's describing.
export interface AuditActor {
  sub: string;
  email: string;
  name: string;
}

export type AuditModule = 'HR' | 'ASSETS' | 'SECURITY' | 'SYSTEM';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export function auditEntry(
  actor: AuditActor,
  module: AuditModule,
  action: AuditAction,
  description: string,
  opts: { severity?: AuditSeverity; ipAddress?: string | null } = {},
) {
  return {
    userId: actor.sub,
    userName: actor.name,
    userEmail: actor.email,
    module,
    action,
    description,
    severity: opts.severity || 'INFO',
    ipAddress: opts.ipAddress || null,
  };
}

// Best-effort request IP, tolerant of being behind a reverse proxy (checks
// X-Forwarded-For first, same convention a real deployment would need
// regardless of this feature).
export function requestIp(req: any): string | null {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim();
  return req?.ip || req?.socket?.remoteAddress || null;
}

// Tiny, dependency-free User-Agent reader shared by AdminService's Live
// User Activity panel and AuthService's new-sign-in notification -- good
// enough for "which browser on which OS" in an admin table or a
// notification body, not a full device-detection library.
export function describeUserAgent(ua?: string | null): string {
  if (!ua) return 'Unknown device';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS X/.test(ua)
      ? 'macOS'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Android/.test(ua)
          ? 'Android'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Unknown OS';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua) && !/Chrome/.test(ua)
          ? 'Safari'
          : 'Unknown browser';
  return `${browser} on ${os}`;
}
