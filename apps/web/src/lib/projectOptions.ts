// Shared vocabulary/styling for Project Management's category + tech stack
// tagging. The five ProjectCategory values here are the real, existing
// schema vocabulary (also used by Technology and Recruitment) — not the
// "IAM / AI / DevOps / Cybersecurity / Software" set from the redesign
// brief, which doesn't exist as a category taxonomy in this schema.
// Reusing the real categories (colored) avoids a churny, wide-reaching
// enum change across Technology + Recruitment for what was really just a
// visual/UX ask.

import { ProjectCategory, ProjectStatus } from '../types';

export interface CategoryStyle {
  label: string;
  pill: string;
  tileBg: string;
  tileBorder: string;
  iconBg: string;
  valueText: string;
}

export const CATEGORY_STYLES: Record<ProjectCategory, CategoryStyle> = {
  IAM: {
    label: 'IAM',
    pill: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
    tileBg: 'bg-gradient-to-br from-indigo-50 to-blue-100/60',
    tileBorder: 'border-indigo-200/70',
    iconBg: 'bg-indigo-500',
    valueText: 'text-indigo-900',
  },
  DEVOPS: {
    label: 'DevOps',
    pill: 'bg-blue-100 text-blue-700 border border-blue-200',
    tileBg: 'bg-gradient-to-br from-blue-50 to-sky-100/60',
    tileBorder: 'border-blue-200/70',
    iconBg: 'bg-blue-500',
    valueText: 'text-blue-900',
  },
  CLOUD_SECURITY: {
    label: 'Cloud Security',
    pill: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
    tileBg: 'bg-gradient-to-br from-cyan-50 to-teal-100/60',
    tileBorder: 'border-cyan-200/70',
    iconBg: 'bg-cyan-500',
    valueText: 'text-cyan-900',
  },
  CYBER_SECURITY: {
    label: 'Cyber Security',
    pill: 'bg-rose-100 text-rose-700 border border-rose-200',
    tileBg: 'bg-gradient-to-br from-rose-50 to-red-100/60',
    tileBorder: 'border-rose-200/70',
    iconBg: 'bg-rose-500',
    valueText: 'text-rose-900',
  },
  ACTIVE_DIRECTORY: {
    label: 'Active Directory',
    pill: 'bg-violet-100 text-violet-700 border border-violet-200',
    tileBg: 'bg-gradient-to-br from-violet-50 to-purple-100/60',
    tileBorder: 'border-violet-200/70',
    iconBg: 'bg-violet-500',
    valueText: 'text-violet-900',
  },
};

// Fallback color cycle for a technology tag whose own category style isn't
// available for some reason (shouldn't normally happen since every
// Technology carries a category) — mirrors the pattern used for client
// avatars/domain fallbacks.
export const TECH_PILL_FALLBACK = 'bg-slate-100 text-slate-600 border border-slate-200';

export const STATUS_STYLES: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-emerald-500 text-white',
  ON_HOLD: 'bg-amber-500 text-white',
  COMPLETED: 'bg-slate-400 text-white',
  CANCELLED: 'bg-red-500 text-white',
};

// 4-tile metric card styling, matching Client Management's tile cycle.
export const METRIC_TILE_STYLES = [
  { bg: 'bg-gradient-to-br from-blue-50 to-sky-100/60', border: 'border-blue-200/70', iconBg: 'bg-blue-500', valueText: 'text-blue-900' },
  { bg: 'bg-gradient-to-br from-violet-50 to-indigo-100/60', border: 'border-violet-200/70', iconBg: 'bg-violet-500', valueText: 'text-violet-900' },
  { bg: 'bg-gradient-to-br from-emerald-50 to-teal-100/60', border: 'border-emerald-200/70', iconBg: 'bg-emerald-500', valueText: 'text-emerald-900' },
  { bg: 'bg-gradient-to-br from-amber-50 to-orange-100/60', border: 'border-amber-200/70', iconBg: 'bg-amber-500', valueText: 'text-amber-900' },
];
