// Shared allowed-value lists for Employee Engagement & Feedback DTOs —
// enforced here since SQLite doesn't support native Prisma enums (same
// pattern as performance.constants.ts / recruitment's constants).

export const RECOGNITION_CATEGORIES = [
  'TEAMWORK',
  'CLIENT_IMPACT',
  'INNOVATION',
  'LEADERSHIP',
  'GOING_ABOVE_AND_BEYOND',
] as const;
export type RecognitionCategory = (typeof RECOGNITION_CATEGORIES)[number];

// Quick emoji reactions on a kudos post, in addition to the classic like.
export const RECOGNITION_REACTION_TYPES = ['LIKE', 'CLAP', 'FIRE', 'ROCKET'] as const;
export type RecognitionReactionType = (typeof RECOGNITION_REACTION_TYPES)[number];

// Fixed reward-point tiers selectable in the Give Kudos modal — a simple
// points economy, not a full rewards ledger/redemption system.
export const RECOGNITION_POINT_OPTIONS = [0, 10, 25, 50, 100] as const;

export const PULSE_SURVEY_STATUSES = ['DRAFT', 'ACTIVE', 'CLOSED'] as const;
export type PulseSurveyStatus = (typeof PULSE_SURVEY_STATUSES)[number];

// A subset of Announcement's audience types — pulse surveys don't need an
// INDIVIDUALS targeting mode.
export const PULSE_SURVEY_AUDIENCE_TYPES = ['ALL', 'DEPARTMENTS'] as const;
export type PulseSurveyAudienceType = (typeof PULSE_SURVEY_AUDIENCE_TYPES)[number];

// RATING = 1-5 scale, YES_NO = boolean, TEXT = free response.
export const PULSE_QUESTION_TYPES = ['RATING', 'YES_NO', 'TEXT'] as const;
export type PulseQuestionType = (typeof PULSE_QUESTION_TYPES)[number];
