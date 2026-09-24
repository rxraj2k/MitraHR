// Server-side mirror of apps/web/src/lib/trainingTracks.ts's CATEGORY_TRACK
// map. Kept here (rather than importing across the api/web boundary) so the
// Learning Center's three top-level tabs and the track-wide Mandatory
// Training assessment agree on which course category belongs to which
// track. Add a category here the moment it's added to TRAINING_CATEGORIES
// in training/dto/upsert-course.dto.ts, or it silently falls out of its
// track's assessment-unlock check.
export const LEARNING_TRACKS = ['MANDATORY', 'IAM_ENGINEERING', 'DEVOPS_ENGINEERING'] as const;
export type LearningTrack = (typeof LEARNING_TRACKS)[number];

export const CATEGORY_TRACK: Record<string, LearningTrack> = {
  AGILE_TOOLS: 'MANDATORY',
  MS365: 'MANDATORY',
  ZOHO_TOOLS: 'MANDATORY',
  SECURITY_IT: 'MANDATORY',
  AI_TOOLS: 'MANDATORY',
  GLOBAL_SKILLS: 'MANDATORY',
  IAM_UDEMY: 'IAM_ENGINEERING',
  IAM_CLOUDFOUNDATION: 'IAM_ENGINEERING',
  IAM_SECAPPS: 'IAM_ENGINEERING',
  DEVOPS_UDEMY: 'DEVOPS_ENGINEERING',
};

export const TRACK_LABELS: Record<LearningTrack, string> = {
  MANDATORY: 'Mandatory Training',
  IAM_ENGINEERING: 'IAM Engineering',
  DEVOPS_ENGINEERING: 'DevOps Engineering',
};

export function categoriesForTrack(track: LearningTrack): string[] {
  return Object.entries(CATEGORY_TRACK)
    .filter(([, t]) => t === track)
    .map(([c]) => c);
}

export function isLearningTrack(value: string): value is LearningTrack {
  return (LEARNING_TRACKS as readonly string[]).includes(value);
}
