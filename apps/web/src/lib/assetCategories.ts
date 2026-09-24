import { AssetCategory, AssetCondition, AssetStatus } from '../types';
import { GlobeIcon, GridIcon, IdCardIcon, KeyIcon, LaptopIcon, MonitorIcon, PackageIcon, SmartphoneIcon } from '../components/icons';

export const ASSET_CATEGORIES: AssetCategory[] = [
  'LAPTOP',
  'MONITOR',
  'PERIPHERALS',
  'MOBILE_PHONE',
  'ID_CARD',
  'SOFTWARE_LICENSE',
  'NETWORKING_EQUIPMENT',
  'OTHER',
];

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  LAPTOP: 'Laptops',
  MONITOR: 'Monitors',
  PERIPHERALS: 'Peripherals',
  MOBILE_PHONE: 'Mobile Phones',
  ID_CARD: 'ID Cards',
  SOFTWARE_LICENSE: 'Software Licenses',
  NETWORKING_EQUIPMENT: 'Networking Equipment',
  OTHER: 'Other',
};

// One accent color per category, matching the Learning Center's colorful
// card treatment so the two catalog-style pages feel like the same app.
export const CATEGORY_THEME: Record<AssetCategory, { bg: string; border: string; text: string; chip: string }> = {
  LAPTOP: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', chip: 'bg-indigo-100 text-indigo-700' },
  MONITOR: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', chip: 'bg-sky-100 text-sky-700' },
  PERIPHERALS: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', chip: 'bg-violet-100 text-violet-700' },
  MOBILE_PHONE: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', chip: 'bg-emerald-100 text-emerald-700' },
  ID_CARD: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', chip: 'bg-amber-100 text-amber-700' },
  SOFTWARE_LICENSE: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-700', chip: 'bg-fuchsia-100 text-fuchsia-700' },
  NETWORKING_EQUIPMENT: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', chip: 'bg-teal-100 text-teal-700' },
  OTHER: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', chip: 'bg-slate-100 text-slate-600' },
};

export const CATEGORY_ICONS: Record<AssetCategory, typeof PackageIcon> = {
  LAPTOP: LaptopIcon,
  MONITOR: MonitorIcon,
  PERIPHERALS: GridIcon,
  MOBILE_PHONE: SmartphoneIcon,
  ID_CARD: IdCardIcon,
  SOFTWARE_LICENSE: KeyIcon,
  NETWORKING_EQUIPMENT: GlobeIcon,
  OTHER: PackageIcon,
};

export const ASSET_STATUSES: AssetStatus[] = ['AVAILABLE', 'ASSIGNED', 'IN_REPAIR', 'RETIRED', 'LOST'];

export const STATUS_LABELS: Record<AssetStatus, string> = {
  AVAILABLE: 'Available',
  ASSIGNED: 'Assigned',
  IN_REPAIR: 'In Repair',
  RETIRED: 'Retired',
  LOST: 'Lost',
};

export const STATUS_BADGE: Record<AssetStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  ASSIGNED: 'bg-indigo-100 text-indigo-700',
  IN_REPAIR: 'bg-amber-100 text-amber-700',
  RETIRED: 'bg-slate-100 text-slate-500',
  LOST: 'bg-red-100 text-red-700',
};

export const ASSET_CONDITIONS: AssetCondition[] = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];

export const CONDITION_LABELS: Record<AssetCondition, string> = {
  NEW: 'New',
  GOOD: 'Good',
  FAIR: 'Fair',
  POOR: 'Poor',
  DAMAGED: 'Damaged',
};
