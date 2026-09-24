import { UtilizationStatus } from '../types';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  GaugeIcon,
  GraduationCapIcon,
  UsersIcon,
} from '../components/icons';

// Shared across Bench & Utilization and the Staffing Sandbox — same status,
// same words, same colors, wherever it shows up in the app.
export const STATUS_LABELS: Record<UtilizationStatus, string> = {
  BENCH: 'On Bench',
  IN_TRAINING: 'In Training',
  PARTIAL: 'Partially Allocated',
  FULL: 'Fully Allocated',
  OVER: 'Over-Allocated',
};

// Compact form for tight spaces like a draggable card's status pill.
export const STATUS_LABELS_SHORT: Record<UtilizationStatus, string> = {
  BENCH: 'Bench',
  IN_TRAINING: 'Training',
  PARTIAL: 'Partial',
  FULL: 'Full',
  OVER: 'Over',
};

export const STATUS_ICON: Record<UtilizationStatus, typeof UsersIcon> = {
  BENCH: UsersIcon,
  IN_TRAINING: GraduationCapIcon,
  PARTIAL: GaugeIcon,
  FULL: CheckCircleIcon,
  OVER: AlertTriangleIcon,
};

// One 3D "theme" per status, reused across the summary tiles, the filter
// pills, the row status badges, and the avatar ring wherever Bench &
// Utilization status shows up — the same color always means the same thing
// everywhere in the app. Badge gradients use the exact hex pairs from the
// original design brief; the tiles/filters lean on Tailwind's palette for a
// softer 3D card look in the same hue family.
export interface StatusTheme {
  ring: 'slate' | 'violet' | 'amber' | 'emerald' | 'rose';
  tileBg: string;
  tileShadow: string;
  filterActive: string;
  filterInactive: string;
  badge: string;
  barSolid: string;
}

export const STATUS_THEME: Record<UtilizationStatus, StatusTheme> = {
  BENCH: {
    ring: 'slate',
    tileBg: 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600',
    tileShadow: 'shadow-[0_12px_28px_-10px_rgba(71,85,105,0.6)]',
    filterActive: 'bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-lg shadow-slate-500/40 ring-2 ring-slate-300',
    filterInactive: 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100',
    badge: 'bg-gradient-to-br from-[#64748B] to-[#475569] text-white shadow shadow-slate-500/30 border border-white/20',
    barSolid: 'bg-slate-300',
  },
  IN_TRAINING: {
    ring: 'violet',
    tileBg: 'bg-gradient-to-br from-violet-400 via-purple-500 to-purple-600',
    tileShadow: 'shadow-[0_12px_28px_-10px_rgba(147,51,234,0.55)]',
    filterActive: 'bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-purple-500/40 ring-2 ring-violet-300',
    filterInactive: 'bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100',
    badge: 'bg-gradient-to-br from-[#A855F7] to-[#9333EA] text-white shadow shadow-purple-500/30 border border-white/20',
    barSolid: 'bg-violet-400',
  },
  PARTIAL: {
    ring: 'amber',
    tileBg: 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600',
    tileShadow: 'shadow-[0_12px_28px_-10px_rgba(217,119,6,0.55)]',
    filterActive: 'bg-gradient-to-br from-amber-500 to-orange-700 text-white shadow-lg shadow-amber-500/40 ring-2 ring-amber-300',
    filterInactive: 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100',
    badge: 'bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white shadow shadow-amber-500/30 border border-white/20',
    barSolid: 'bg-amber-500',
  },
  FULL: {
    ring: 'emerald',
    tileBg: 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600',
    tileShadow: 'shadow-[0_12px_28px_-10px_rgba(5,150,105,0.55)]',
    filterActive: 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300',
    filterInactive: 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100',
    badge: 'bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow shadow-emerald-500/30 border border-white/20',
    barSolid: 'bg-emerald-500',
  },
  OVER: {
    ring: 'rose',
    tileBg: 'bg-gradient-to-br from-rose-400 via-red-500 to-red-600',
    tileShadow: 'shadow-[0_12px_28px_-10px_rgba(220,38,38,0.6)]',
    filterActive: 'bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-lg shadow-red-500/40 ring-2 ring-red-300',
    filterInactive: 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100',
    badge: 'bg-gradient-to-br from-[#EF4444] to-[#DC2626] text-white shadow shadow-red-500/30 border border-white/20',
    barSolid: 'bg-red-500',
  },
};
