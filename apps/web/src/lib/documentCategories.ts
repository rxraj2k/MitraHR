import { CompanyDocumentCategory, EmployeeDocumentType } from '../types';

export const EMPLOYEE_DOCUMENT_TYPES: EmployeeDocumentType[] = [
  'OFFER_LETTER',
  'ID_PROOF',
  'PAN_CARD',
  'ACADEMIC_CERTIFICATE',
  'EXPERIENCE_LETTER',
  'CONTRACT',
  'CERTIFICATION',
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
