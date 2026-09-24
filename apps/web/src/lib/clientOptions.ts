// Shared vocabulary for Client Management's US timezone picker and
// technical-domain tag picker. Values mirror apps/api/src/clients/dto/
// client.constants.ts exactly (kept in sync by hand — small fixed lists,
// no codegen in this project) since the backend validates against the
// same codes.

export interface TimezoneOption {
  code: string;
  label: string;
  shortLabel: string;
}

export const US_TIMEZONES: TimezoneOption[] = [
  { code: 'EST_EDT', label: 'EST / EDT (Eastern Time)', shortLabel: 'EST/EDT' },
  { code: 'CST_CDT', label: 'CST / CDT (Central Time)', shortLabel: 'CST/CDT' },
  { code: 'MST_MDT', label: 'MST / MDT (Mountain Time)', shortLabel: 'MST/MDT' },
  { code: 'PST_PDT', label: 'PST / PDT (Pacific Time)', shortLabel: 'PST/PDT' },
  { code: 'AKST_AKDT', label: 'AKST / AKDT (Alaska Time)', shortLabel: 'AKST/AKDT' },
  { code: 'HST', label: 'HST (Hawaii Standard Time)', shortLabel: 'HST' },
];

export const US_TIMEZONE_BY_CODE: Record<string, TimezoneOption> = Object.fromEntries(
  US_TIMEZONES.map((t) => [t.code, t]),
);

export interface DomainOption {
  code: string;
  label: string;
  shortLabel: string;
  pill: string;
}

// Colored per the standing "every tag/card gets color" house style —
// each domain gets its own distinct hue, reused for both the picker chips
// and the client-table pills.
export const CLIENT_DOMAINS: DomainOption[] = [
  { code: 'IAM', label: 'IAM (Identity & Access Management)', shortLabel: 'IAM', pill: 'bg-indigo-100 text-indigo-700 border border-indigo-200' },
  { code: 'AI_ML', label: 'AI & Machine Learning', shortLabel: 'AI & ML', pill: 'bg-violet-100 text-violet-700 border border-violet-200' },
  { code: 'DEVOPS_CLOUD', label: 'DevOps & Cloud Infrastructure', shortLabel: 'DevOps & Cloud', pill: 'bg-blue-100 text-blue-700 border border-blue-200' },
  { code: 'CYBERSECURITY', label: 'Cybersecurity & Compliance', shortLabel: 'Cybersecurity', pill: 'bg-rose-100 text-rose-700 border border-rose-200' },
  { code: 'ENTERPRISE_SOFTWARE', label: 'Enterprise Software Engineering', shortLabel: 'Enterprise SW', pill: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
];

export const CLIENT_DOMAIN_BY_CODE: Record<string, DomainOption> = Object.fromEntries(
  CLIENT_DOMAINS.map((d) => [d.code, d]),
);

// The `industry` column stays a single free-text string on the Client
// model (SQLite has no array type) — multiple domains are stored
// comma-joined ("IAM,DEVOPS_CLOUD") and split back apart here.
export function parseDomains(industry?: string | null): string[] {
  if (!industry) return [];
  return industry
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serializeDomains(codes: string[]): string {
  return codes.join(',');
}
