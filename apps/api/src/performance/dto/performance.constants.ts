// Shared allowed-value lists for Performance & Goal Management DTOs —
// enforced here since SQLite doesn't support native Prisma enums (same
// pattern as JOB_OPENING_STATUSES / CANDIDATE_STAGES in recruitment, or
// APPROVAL_GROUPS in employee-exits).

export const REVIEW_CYCLE_STATUSES = ['DRAFT', 'ACTIVE', 'CLOSED'] as const;
export type ReviewCycleStatus = (typeof REVIEW_CYCLE_STATUSES)[number];

export const GOAL_CATEGORIES = ['INDIVIDUAL', 'TEAM', 'COMPANY'] as const;
export type GoalCategory = (typeof GOAL_CATEGORIES)[number];

export const GOAL_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'COMPLETED'] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const CHECK_IN_CONFIDENCE_LEVELS = ['ON_TRACK', 'AT_RISK', 'OFF_TRACK'] as const;
export type CheckInConfidence = (typeof CHECK_IN_CONFIDENCE_LEVELS)[number];

export const PERFORMANCE_REVIEW_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const;
export type PerformanceReviewStatus = (typeof PERFORMANCE_REVIEW_STATUSES)[number];

// A review typically gets one SELF entry, one MANAGER entry, any number
// of PEER entries, and — for US client-facing roles — CLIENT/stakeholder
// feedback too (the "360-degree" part) — enforced loosely via
// the @@unique([performanceReviewId, raterId, raterType]) constraint
// rather than a hard cap, so the same rater can't double-submit the same
// rater-type role twice.
export const REVIEW_RATER_TYPES = ['SELF', 'MANAGER', 'PEER', 'CLIENT'] as const;
export type ReviewRaterType = (typeof REVIEW_RATER_TYPES)[number];
