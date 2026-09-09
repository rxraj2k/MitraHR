// Fixed category list for employee documents — validated manually (these
// endpoints take multipart bodies, not a class-validator DTO) rather than a
// Master Data lookup, mirroring the Asset category precedent from Sprint 7.
export const EMPLOYEE_DOCUMENT_TYPES = [
  'OFFER_LETTER',
  'ID_PROOF',
  'PAN_CARD',
  'ACADEMIC_CERTIFICATE',
  'EXPERIENCE_LETTER',
  'CONTRACT',
  'CERTIFICATION',
  'OTHER',
] as const;

export type EmployeeDocumentType = (typeof EMPLOYEE_DOCUMENT_TYPES)[number];
