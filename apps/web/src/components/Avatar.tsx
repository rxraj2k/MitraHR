import { API_BASE } from '../lib/api';

// Pulled out of pages/organization/Organization.tsx during the Zoho-People
// nav reorg (that file's tabs each became their own routed page, so this
// shared UI primitive needed a home that isn't page-specific) — every other
// import site (OrgChart, My Space, My Team, the Organization sub-pages,
// EmployeeProfileModal) points here now.
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

// Tailwind can't resolve a class built from a runtime template string
// (`w-${size}`), so sizes are a small literal lookup instead.
export const AVATAR_SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-11 h-11 text-xs',
  lg: 'w-16 h-16 text-sm',
};

// Role-tinted ring around the plain Avatar — used wherever the same kind
// of person shows up in different roles on one row (Primary vs Secondary
// Mentor on a project) and needs to read apart at a glance without a
// separate label each time. Keeps the base Avatar's own neutral styling
// untouched since that's used everywhere and out of scope to recolor.
const RING_COLORS: Record<'sky' | 'violet' | 'emerald' | 'amber' | 'slate' | 'rose', string> = {
  sky: 'ring-sky-300',
  violet: 'ring-violet-300',
  emerald: 'ring-emerald-300',
  amber: 'ring-amber-300',
  slate: 'ring-slate-300',
  rose: 'ring-rose-300',
};

export function RingAvatar({
  name,
  photoUrl,
  ring,
  size = 'sm',
}: {
  name: string;
  photoUrl?: string | null;
  ring: 'sky' | 'violet' | 'emerald' | 'amber' | 'slate' | 'rose';
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <span className={`inline-flex rounded-full ring-2 ${RING_COLORS[ring]} flex-shrink-0`}>
      <Avatar name={name} photoUrl={photoUrl} size={size} />
    </span>
  );
}

export function Avatar({
  name,
  photoUrl,
  size = 'md',
  shape = 'circle',
}: {
  name: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
}) {
  const dim = AVATAR_SIZE_CLASSES[size];
  const rounding = shape === 'square' ? 'rounded-xl' : 'rounded-full';
  return photoUrl ? (
    <img src={`${API_BASE}${photoUrl}`} alt="" className={`${dim} ${rounding} object-cover flex-shrink-0`} />
  ) : (
    <div className={`${dim} ${rounding} bg-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0 font-medium`}>
      {initials(name)}
    </div>
  );
}
