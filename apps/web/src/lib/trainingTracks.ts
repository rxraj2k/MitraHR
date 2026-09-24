import { LearningTrack, TrainingCategory } from '../types';

// Which top-level Learning Center tab each course category belongs under.
// Mandatory Training keeps the six original onboarding categories; IAM
// Engineering and DevOps Engineering are role-specific tool/skill tracks
// added on top — same course/assignment/progress machinery underneath,
// just grouped into their own tab so the two don't get lost among each
// other. Add a category's key here the moment it's added to
// TRAINING_CATEGORIES, or it'll silently fall out of every tab.
export const CATEGORY_TRACK: Record<TrainingCategory, LearningTrack> = {
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

export const TRAINING_TRACKS: LearningTrack[] = ['MANDATORY', 'IAM_ENGINEERING', 'DEVOPS_ENGINEERING'];

export const TRACK_LABELS: Record<LearningTrack, string> = {
  MANDATORY: 'Mandatory Training',
  IAM_ENGINEERING: 'IAM Engineering',
  DEVOPS_ENGINEERING: 'DevOps Engineering',
};

// One 3D gradient per tab, used for the tab pills themselves.
export const TRACK_THEME: Record<LearningTrack, { active: string; glow: string }> = {
  MANDATORY: { active: 'bg-gradient-to-br from-indigo-500 to-indigo-700', glow: 'shadow-indigo-500/40 ring-indigo-300' },
  IAM_ENGINEERING: { active: 'bg-gradient-to-br from-cyan-500 to-teal-700', glow: 'shadow-cyan-500/40 ring-cyan-300' },
  DEVOPS_ENGINEERING: { active: 'bg-gradient-to-br from-orange-500 to-red-600', glow: 'shadow-orange-500/40 ring-orange-300' },
};

export function categoriesForTrack(track: LearningTrack, allCategories: TrainingCategory[]): TrainingCategory[] {
  return allCategories.filter((c) => CATEGORY_TRACK[c] === track);
}
