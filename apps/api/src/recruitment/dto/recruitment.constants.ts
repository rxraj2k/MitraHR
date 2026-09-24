// Shared allowed-value lists for Recruitment DTOs — enforced here since
// SQLite doesn't support native Prisma enums (same pattern as
// CLIENT_CONTRACT_STATUSES / APPROVAL_GROUPS elsewhere in this app).
export const JOB_OPENING_STATUSES = ['OPEN', 'ON_HOLD', 'CLOSED'] as const;
export type JobOpeningStatus = (typeof JOB_OPENING_STATUSES)[number];

// Same vocabulary as Employee.employmentType (EMPLOYMENT_TYPES in
// employees/dto/create-employee.dto.ts) — a requisition's employment type
// and the employee eventually hired for it should speak the same language.
export const JOB_OPENING_EMPLOYMENT_TYPES = ['INTERN', 'FULL_TIME', 'PART_TIME', 'CONTRACTOR'] as const;
export type JobOpeningEmploymentType = (typeof JOB_OPENING_EMPLOYMENT_TYPES)[number];

export const EXPERIENCE_LEVELS = ['ENTRY', 'MID', 'SENIOR', 'LEAD'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

// Order matters — the frontend uses this array's order for both the Kanban
// board's column order and the stage-stepper progression, mirroring the
// real process: apply -> screening call -> technical round -> client round
// (Sanjay's final 1-on-1, which for US client roles doubles as the client
// interview) -> offer -> hired. REJECTED can happen from any stage, so it's
// kept separate from the "forward" flow rather than positioned as a step.
export const CANDIDATE_STAGES = [
  'APPLIED',
  'SCREENING_CALL',
  'TECHNICAL_ROUND',
  'FINAL_ROUND',
  'OFFER_EXTENDED',
  'HIRED',
  'REJECTED',
] as const;
export type CandidateStage = (typeof CANDIDATE_STAGES)[number];
