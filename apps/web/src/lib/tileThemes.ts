// The tactile "3D" metric-tile look introduced on Bench & Utilization —
// saturated gradient background, layered drop shadow, hover lift — pulled
// out into a shared palette + class helper so every KPI/summary card grid
// in the app (Project Management, Client Management, Home dashboard,
// Recruitment, Asset Management, Exit Clearance, Organization, Reports,
// Performance...) can reuse the exact same design instead of each page
// hand-rolling its own flat pastel tile style.
//
// Usage: cycle TILE_THEMES by index for a generic KPI grid (color is just
// visual variety, not meaningful), or hand-pick a theme by hue when the
// color needs to carry meaning (e.g. red for "over-allocated", emerald for
// "fully allocated" — see UtilizationPage's own STATUS_THEME, which follows
// the same shape and can be used interchangeably with these helpers).
export interface TileTheme {
  tileBg: string;
  tileShadow: string;
}

export const TILE_THEMES: TileTheme[] = [
  {
    tileBg: 'bg-gradient-to-br from-indigo-400 via-indigo-500 to-indigo-600',
    tileShadow: 'shadow-[0_12px_28px_-10px_rgba(79,70,229,0.55)]',
  },
  {
    tileBg: 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600',
    tileShadow: 'shadow-[0_12px_28px_-10px_rgba(217,119,6,0.55)]',
  },
  {
    tileBg: 'bg-gradient-to-br from-sky-400 via-blue-500 to-blue-600',
    tileShadow: 'shadow-[0_12px_28px_-10px_rgba(37,99,235,0.55)]',
  },
  {
    tileBg: 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600',
    tileShadow: 'shadow-[0_12px_28px_-10px_rgba(5,150,105,0.55)]',
  },
  {
    tileBg: 'bg-gradient-to-br from-rose-400 via-red-500 to-red-600',
    tileShadow: 'shadow-[0_12px_28px_-10px_rgba(220,38,38,0.6)]',
  },
  {
    tileBg: 'bg-gradient-to-br from-violet-400 via-purple-500 to-purple-600',
    tileShadow: 'shadow-[0_12px_28px_-10px_rgba(147,51,234,0.55)]',
  },
  {
    tileBg: 'bg-gradient-to-br from-teal-400 via-cyan-500 to-cyan-600',
    tileShadow: 'shadow-[0_12px_28px_-10px_rgba(8,145,178,0.55)]',
  },
  {
    tileBg: 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600',
    tileShadow: 'shadow-[0_12px_28px_-10px_rgba(71,85,105,0.6)]',
  },
];

// Named lookups for the handful of places where a tile's color needs to
// carry specific meaning (danger = red, success = green, ...) rather than
// just cycling for variety.
export const TILE_THEME_BY_NAME = {
  indigo: TILE_THEMES[0],
  amber: TILE_THEMES[1],
  sky: TILE_THEMES[2],
  emerald: TILE_THEMES[3],
  rose: TILE_THEMES[4],
  violet: TILE_THEMES[5],
  teal: TILE_THEMES[6],
  slate: TILE_THEMES[7],
} as const;

// The outer wrapper class for a 3D tile — works on a <div>, <button> or
// react-router <Link> alike, since it's just a className string. `active`
// adds the glowing selected ring used when a tile doubles as a filter.
export function tileWrapperClass(theme: TileTheme, opts: { active?: boolean } = {}): string {
  return `block text-left rounded-2xl p-5 border border-white/10 ${theme.tileBg} ${theme.tileShadow} transition-all duration-150 ease-out hover:-translate-y-1 active:translate-y-0${
    opts.active ? ' ring-4 ring-white/70 scale-[1.02]' : ''
  }`;
}
