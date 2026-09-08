import { TrainingCategory } from '../types';
import {
  ClipboardListIcon,
  GlobeIcon,
  GridIcon,
  NotebookIcon,
  ShieldIcon,
  SparkleIcon,
} from '../components/icons';

export const TRAINING_CATEGORIES: TrainingCategory[] = [
  'AGILE_TOOLS',
  'MS365',
  'ZOHO_TOOLS',
  'SECURITY_IT',
  'AI_TOOLS',
  'GLOBAL_SKILLS',
];

export const CATEGORY_LABELS: Record<TrainingCategory, string> = {
  AGILE_TOOLS: 'Agile & Project Tools',
  MS365: 'Microsoft 365 & Productivity',
  ZOHO_TOOLS: 'Zoho Tools',
  SECURITY_IT: 'IT & Security',
  AI_TOOLS: 'AI Tools',
  GLOBAL_SKILLS: 'Global Work Skills',
};

// One accent color per category, reused for section headers, chips, and
// progress bars — this is what makes the Learning Center feel like a
// colorful course catalog instead of a plain admin list.
export const CATEGORY_THEME: Record<
  TrainingCategory,
  { bg: string; border: string; text: string; chip: string; bar: string; gradient: string }
> = {
  AGILE_TOOLS: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    chip: 'bg-indigo-100 text-indigo-700',
    bar: 'bg-indigo-500',
    gradient: 'from-indigo-500 to-indigo-400',
  },
  MS365: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
    chip: 'bg-sky-100 text-sky-700',
    bar: 'bg-sky-500',
    gradient: 'from-sky-500 to-sky-400',
  },
  ZOHO_TOOLS: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    chip: 'bg-rose-100 text-rose-700',
    bar: 'bg-rose-500',
    gradient: 'from-rose-500 to-rose-400',
  },
  SECURITY_IT: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    chip: 'bg-amber-100 text-amber-700',
    bar: 'bg-amber-500',
    gradient: 'from-amber-500 to-amber-400',
  },
  AI_TOOLS: {
    bg: 'bg-fuchsia-50',
    border: 'border-fuchsia-200',
    text: 'text-fuchsia-700',
    chip: 'bg-fuchsia-100 text-fuchsia-700',
    bar: 'bg-fuchsia-500',
    gradient: 'from-fuchsia-500 to-fuchsia-400',
  },
  GLOBAL_SKILLS: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    chip: 'bg-emerald-100 text-emerald-700',
    bar: 'bg-emerald-500',
    gradient: 'from-emerald-500 to-emerald-400',
  },
};

export const CATEGORY_ICONS: Record<TrainingCategory, typeof ClipboardListIcon> = {
  AGILE_TOOLS: ClipboardListIcon,
  MS365: GridIcon,
  ZOHO_TOOLS: NotebookIcon,
  SECURITY_IT: ShieldIcon,
  AI_TOOLS: SparkleIcon,
  GLOBAL_SKILLS: GlobeIcon,
};
