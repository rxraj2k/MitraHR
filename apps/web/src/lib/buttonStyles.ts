// Shared "3D" button/pill treatment — the same tactile look introduced on
// Bench & Utilization's filter buttons (gradient fill, shadow, hover lift,
// press-down on click) — so every toggle/segmented-control button in the
// app can pick it up instead of staying a flat tinted pill.

// The app's primary brand action button (e.g. "+ New Project", "Save").
// Existing call sites already carry this string inline (added in a bulk
// pass across the app); new primary buttons should use this constant.
export const PRIMARY_BUTTON_3D =
  'bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150';

// A tactile pill/segmented-control button — pass the gradient (and any
// tone-specific ring/shadow color) for the ACTIVE state; the inactive
// state is the same for every hue so a whole filter row stays visually
// calm until one option is picked.
export function toggle3dActive(gradient: string, glow = 'shadow-slate-500/40'): string {
  return `text-white border border-transparent ${gradient} shadow-lg ${glow} ring-2 ring-white/40 hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-150 ease-out`;
}

export const TOGGLE_3D_INACTIVE =
  'bg-white text-slate-500 border border-slate-200 shadow-sm hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0.5 transition-all duration-150 ease-out';

// Named gradients for the common category/status hues used across
// Engagement, Recruitment stages, project categories, etc. — pick one and
// pass it to toggle3dActive().
export const HUE_GRADIENTS = {
  sky: 'bg-gradient-to-br from-sky-400 to-blue-500',
  fuchsia: 'bg-gradient-to-br from-fuchsia-400 to-pink-500',
  amber: 'bg-gradient-to-br from-amber-400 to-orange-500',
  indigo: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
  emerald: 'bg-gradient-to-br from-emerald-400 to-teal-500',
  slate: 'bg-gradient-to-br from-slate-500 to-slate-700',
  rose: 'bg-gradient-to-br from-rose-400 to-red-500',
  violet: 'bg-gradient-to-br from-violet-400 to-purple-600',
  cyan: 'bg-gradient-to-br from-cyan-400 to-blue-600',
  lime: 'bg-gradient-to-br from-lime-400 to-green-600',
} as const;
