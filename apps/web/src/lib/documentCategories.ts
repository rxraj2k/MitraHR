import { CompanyDocumentCategory, EmployeeDocumentType, ClientRegion, CLIENT_REGIONS } from '../types';

export { CLIENT_REGIONS };
export type { ClientRegion };

export const CLIENT_REGION_LABELS: Record<ClientRegion, string> = {
  US_EAST: 'US East',
  US_CENTRAL: 'US Central',
  US_MOUNTAIN: 'US Mountain',
  US_PACIFIC: 'US Pacific',
  NON_US: 'Non-US',
};

export const EMPLOYEE_DOCUMENT_TYPES: EmployeeDocumentType[] = [
  'OFFER_LETTER',
  'ID_PROOF',
  'PAN_CARD',
  'ACADEMIC_CERTIFICATE',
  'EXPERIENCE_LETTER',
  'CONTRACT',
  'CERTIFICATION',
  'VISA',
  'OTHER',
];

export const EMPLOYEE_DOCUMENT_TYPE_LABELS: Record<EmployeeDocumentType, string> = {
  OFFER_LETTER: 'Offer Letter',
  ID_PROOF: 'ID Proof',
  PAN_CARD: 'PAN Card',
  ACADEMIC_CERTIFICATE: 'Academic Certificate',
  EXPERIENCE_LETTER: 'Experience Letter',
  CONTRACT: 'Contract',
  CERTIFICATION: 'Certification',
  VISA: 'Visa',
  OTHER: 'Other',
};

export const COMPANY_DOCUMENT_CATEGORIES: CompanyDocumentCategory[] = ['POLICY', 'TEMPLATE', 'HANDBOOK', 'OTHER'];

export const COMPANY_DOCUMENT_CATEGORY_LABELS: Record<CompanyDocumentCategory, string> = {
  POLICY: 'Policy',
  TEMPLATE: 'Template',
  HANDBOOK: 'Handbook',
  OTHER: 'Other',
};

export const COMPANY_DOCUMENT_CATEGORY_THEME: Record<CompanyDocumentCategory, string> = {
  POLICY: 'bg-indigo-100 text-indigo-700',
  TEMPLATE: 'bg-sky-100 text-sky-700',
  HANDBOOK: 'bg-emerald-100 text-emerald-700',
  OTHER: 'bg-slate-100 text-slate-600',
};

export type ExpiryStatus = 'EXPIRED' | 'EXPIRING_SOON' | 'VALID' | 'NONE';

// "Expiring soon" = within 30 days, matching the plainest reading of the
// Sprint 8 brief ("its expiry flagged") without inventing a configurable
// threshold nobody asked for yet.
const EXPIRING_SOON_WINDOW_DAYS = 30;

export function getExpiryStatus(expiryDate?: string | null): ExpiryStatus {
  if (!expiryDate) return 'NONE';
  const days = (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days < 0) return 'EXPIRED';
  if (days <= EXPIRING_SOON_WINDOW_DAYS) return 'EXPIRING_SOON';
  return 'VALID';
}

export const EXPIRY_STATUS_LABELS: Record<ExpiryStatus, string> = {
  EXPIRED: 'Expired',
  EXPIRING_SOON: 'Expiring Soon',
  VALID: 'Valid',
  NONE: 'No Expiry',
};

export const EXPIRY_STATUS_BADGE: Record<ExpiryStatus, string> = {
  EXPIRED: 'bg-red-100 text-red-700',
  EXPIRING_SOON: 'bg-amber-100 text-amber-700',
  VALID: 'bg-green-100 text-green-700',
  NONE: 'bg-slate-100 text-slate-500',
};


export type FileKind = 'pdf' | 'doc' | 'image' | 'other';

export function getFileExt(fileName: string): string {
  const m = fileName.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toUpperCase() : '';
}

export function getFileKind(fileName: string): FileKind {
  const ext = getFileExt(fileName).toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'doc' || ext === 'docx') return 'doc';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  return 'other';
}

// One accent per file kind — used for the small monogram badge next to a
// file name in tables and cards (no dedicated PDF/Word SVG icons in the
// app yet, so a colored extension chip carries the same "what is this"
// signal at a glance, the same pattern Slack/Drive use).
export const FILE_KIND_THEME: Record<FileKind, string> = {
  pdf: 'bg-red-100 text-red-700',
  doc: 'bg-blue-100 text-blue-700',
  image: 'bg-emerald-100 text-emerald-700',
  other: 'bg-slate-100 text-slate-600',
};

// Formats that the document upload dropzones accept — shown as badges in
// the drag-and-drop zone and enforced client-side before the file even
// reaches the (also-enforced) server-side allowlist.
export const ALLOWED_UPLOAD_EXTENSIONS = ['PDF', 'DOCX', 'DOC', 'PNG', 'JPG', 'JPEG'];
export const MAX_UPLOAD_SIZE_MB = 10;

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
