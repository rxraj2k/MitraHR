// The "chrome + accent" themes -- see ThemeContext.tsx for how these get
// applied. Deliberately scoped: these variables only ever drive the
// sidebar, header, and small chrome accents (badges, the profile pill,
// notification dots, the sidebar's per-module nav cards). Page content --
// tables, forms, most card bodies -- keeps its existing clean light/dark
// Tailwind styling and never reads these variables. That split was an
// explicit, confirmed scope decision (the alternative -- retinting all ~80
// files that use the old static mitra-accentFrom/To brand colors -- would
// have been a multi-sprint retrofit of the whole app, not a themed accent
// layer).
export type ThemeName = 'neon-aurora' | 'cyber-velvet' | 'spectrum-pop' | 'emerald-fusion' | 'aqua-glass' | 'iridescent-glass';

export interface ThemeVars {
  // Requested-by-name variables (dev prompt): primary chrome surface, the
  // secondary/elevated chrome surface, primary chrome text, and the accent
  // glow used on active/hover states.
  '--bg-primary': string;
  '--bg-card': string;
  '--text-primary': string;
  '--accent-glow': string;
  // Supporting variables needed to actually theme a whole chrome, added
  // under the same convention (kept to a minimum).
  '--text-secondary': string;
  '--chrome-border': string;
  '--nav-hover-bg': string;
  '--nav-active-bg': string;
  '--accent-from': string;
  '--accent-to': string;
  '--accent-solid': string;
  // Added for Aqua Glass: a permanent (not just hover/active) glass-pill
  // treatment on every sidebar nav row. A no-op (transparent/none) on the
  // other four themes, so they render exactly as before.
  '--nav-card-bg': string;
  '--nav-card-border': string;
  '--nav-card-shadow': string;
  '--glass-blur': string;
}

export interface ThemeDefinition {
  id: ThemeName;
  label: string;
  emoji: string;
  hint: string;
  mode: 'light' | 'dark';
  // Two swatch colors for the picker chip preview.
  swatch: [string, string];
  vars: ThemeVars;
}

// Shared no-op values for the four flat/solid themes -- none of them use a
// glass sidebar treatment, so these keep every nav row exactly as it
// rendered before Aqua Glass was added.
const NO_GLASS = {
  '--nav-card-bg': 'transparent',
  '--nav-card-border': 'transparent',
  '--nav-card-shadow': '0 0 0 transparent',
  '--glass-blur': 'none',
} as const;

export const THEMES: Record<ThemeName, ThemeDefinition> = {
  'neon-aurora': {
    id: 'neon-aurora',
    label: 'Neon Aurora',
    emoji: '⬛',
    hint: 'Pink/Purple Glow',
    mode: 'dark',
    swatch: ['#EC4899', '#8B5CF6'],
    vars: {
      '--bg-primary': '#0f1030',
      '--bg-card': '#1a1b3f',
      '--text-primary': '#F5F3FF',
      '--text-secondary': '#A5ADCB',
      '--chrome-border': 'rgba(255,255,255,0.08)',
      '--nav-hover-bg': 'rgba(255,255,255,0.06)',
      '--nav-active-bg': 'rgba(255,255,255,0.10)',
      '--accent-from': '#EC4899',
      '--accent-to': '#8B5CF6',
      '--accent-solid': '#C084FC',
      '--accent-glow': 'rgba(236,72,153,0.45)',
      ...NO_GLASS,
    },
  },
  'cyber-velvet': {
    id: 'cyber-velvet',
    label: 'Cyber Velvet',
    emoji: '🟪',
    hint: 'Plum/Lime Glow',
    mode: 'dark',
    swatch: ['#A3E635', '#7C3AED'],
    vars: {
      '--bg-primary': '#1F1033',
      '--bg-card': '#2A1745',
      '--text-primary': '#F3E8FF',
      '--text-secondary': '#B9A6D9',
      '--chrome-border': 'rgba(255,255,255,0.08)',
      '--nav-hover-bg': 'rgba(255,255,255,0.06)',
      '--nav-active-bg': 'rgba(255,255,255,0.10)',
      '--accent-from': '#A3E635',
      '--accent-to': '#7C3AED',
      '--accent-solid': '#BEF264',
      '--accent-glow': 'rgba(163,230,53,0.40)',
      ...NO_GLASS,
    },
  },
  'spectrum-pop': {
    id: 'spectrum-pop',
    label: 'Spectrum Pop',
    emoji: '⬜',
    hint: 'Vibrant Light',
    mode: 'light',
    swatch: ['#F97316', '#EC4899'],
    vars: {
      '--bg-primary': '#FFFBFE',
      '--bg-card': '#FFFFFF',
      '--text-primary': '#0F172A',
      '--text-secondary': '#64748B',
      '--chrome-border': 'rgba(15,23,42,0.08)',
      '--nav-hover-bg': 'rgba(124,58,237,0.06)',
      '--nav-active-bg': 'rgba(124,58,237,0.10)',
      '--accent-from': '#F97316',
      '--accent-to': '#EC4899',
      '--accent-solid': '#DB2777',
      '--accent-glow': 'rgba(249,115,22,0.35)',
      ...NO_GLASS,
    },
  },
  'emerald-fusion': {
    id: 'emerald-fusion',
    label: 'Emerald Fusion',
    emoji: '🟩',
    hint: 'Green/Gold Light',
    mode: 'light',
    swatch: ['#10B981', '#EAB308'],
    vars: {
      '--bg-primary': '#F6FBF7',
      '--bg-card': '#FFFFFF',
      '--text-primary': '#0F172A',
      '--text-secondary': '#5B6B63',
      '--chrome-border': 'rgba(6,78,59,0.10)',
      '--nav-hover-bg': 'rgba(5,150,105,0.07)',
      '--nav-active-bg': 'rgba(5,150,105,0.12)',
      '--accent-from': '#10B981',
      '--accent-to': '#EAB308',
      '--accent-solid': '#059669',
      '--accent-glow': 'rgba(16,185,129,0.35)',
      ...NO_GLASS,
    },
  },
  // The water-bubble / frosted-glass theme from the login page redesign,
  // carried over as a full chrome theme: a soft aqua-and-sand gradient
  // sidebar with a few translucent "bubble" highlights baked right into
  // the background gradient, and every nav item rendered as its own
  // frosted glass pill (backdrop-blur + a bright rim + inset highlight)
  // rather than a flat color -- "menus and module names... like a water
  // bubble or transparent plastic or glass", per his request.
  'aqua-glass': {
    id: 'aqua-glass',
    label: 'Aqua Glass',
    emoji: '💧',
    hint: 'Water Bubble Glass',
    mode: 'light',
    swatch: ['#FFFFFF', '#FF7A29'],
    vars: {
      '--bg-primary':
        'radial-gradient(circle at 15% 15%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 20%), ' +
        'radial-gradient(circle at 82% 28%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 18%), ' +
        'radial-gradient(circle at 30% 78%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 16%), ' +
        'radial-gradient(circle at 72% 90%, rgba(255,122,41,0.14) 0%, rgba(255,122,41,0) 22%), ' +
        'linear-gradient(160deg, #EAF6F6 0%, #DCEFEE 40%, #EFE7D8 100%)',
      '--bg-card': 'rgba(255,255,255,0.55)',
      '--text-primary': '#1E293B',
      '--text-secondary': '#64748B',
      '--chrome-border': 'rgba(255,255,255,0.6)',
      '--nav-hover-bg': 'rgba(255,255,255,0.28)',
      '--nav-active-bg': 'rgba(255,255,255,0.45)',
      '--accent-from': '#FF7A29',
      '--accent-to': '#FFB074',
      '--accent-solid': '#FF7A29',
      '--accent-glow': 'rgba(255,122,41,0.35)',
      '--nav-card-bg': 'rgba(255,255,255,0.18)',
      '--nav-card-border': 'rgba(255,255,255,0.55)',
      '--nav-card-shadow': 'inset 0 1px 1px rgba(255,255,255,0.7), 0 4px 14px -6px rgba(0,0,0,0.1)',
      '--glass-blur': 'blur(10px) saturate(160%)',
    },
  },
  // Premium neo-glassmorphism theme, per his brief: "Apple's minimalist
  // elegance... reimagined with fluid gradients, glassy textures and
  // organic shapes... iridescent gradients (blue-pink-purple)... gel-like
  // buttons, floating elements, tactile controls" for a high-end SaaS/
  // fintech feel. Built on the same glass-chrome mechanism Aqua Glass
  // introduced (translucent gradient backdrop + frosted nav pills), just
  // re-tinted from aqua/sand to a blue -> purple -> pink iridescent wash,
  // with a brighter blur/saturation and a soft inset highlight + colored
  // glow on the nav pills for the "gel button" tactility the brief asks
  // for. Chrome-only, like every other theme here (see the top-of-file
  // note on why page content itself stays outside the theme system).
  'iridescent-glass': {
    id: 'iridescent-glass',
    label: 'Iridescent Glass',
    emoji: '\ud83d\udc8e',
    hint: 'Iridescent Premium Glass',
    mode: 'light',
    swatch: ['#6366F1', '#EC4899'],
    vars: {
      '--bg-primary':
        'radial-gradient(circle at 18% 18%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 24%), ' +
        'radial-gradient(circle at 82% 12%, rgba(236,72,153,0.20) 0%, rgba(236,72,153,0) 28%), ' +
        'radial-gradient(circle at 22% 82%, rgba(99,102,241,0.20) 0%, rgba(99,102,241,0) 26%), ' +
        'radial-gradient(circle at 88% 84%, rgba(59,130,246,0.16) 0%, rgba(59,130,246,0) 28%), ' +
        'linear-gradient(150deg, #EEF2FF 0%, #F5EEFC 45%, #FDEEF6 100%)',
      '--bg-card': 'rgba(255,255,255,0.62)',
      '--text-primary': '#201B33',
      '--text-secondary': '#645C7A',
      '--chrome-border': 'rgba(255,255,255,0.6)',
      '--nav-hover-bg': 'rgba(255,255,255,0.32)',
      '--nav-active-bg': 'rgba(255,255,255,0.55)',
      '--accent-from': '#6366F1',
      '--accent-to': '#EC4899',
      '--accent-solid': '#8B5CF6',
      '--accent-glow': 'rgba(139,92,246,0.38)',
      '--nav-card-bg': 'rgba(255,255,255,0.24)',
      '--nav-card-border': 'rgba(255,255,255,0.65)',
      '--nav-card-shadow':
        'inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -1px 3px rgba(139,92,246,0.10), 0 6px 20px -8px rgba(99,102,241,0.30)',
      '--glass-blur': 'blur(14px) saturate(180%)',
    },
  },
};

export const THEME_ORDER: ThemeName[] = ['neon-aurora', 'cyber-velvet', 'spectrum-pop', 'emerald-fusion', 'aqua-glass', 'iridescent-glass'];

// The profile menu's one-click quick toggle switches mode (dark <-> light)
// without opening the full picker in Account Settings. Each theme pairs
// with whichever theme of the opposite mode it was announced alongside, so
// the toggle feels predictable rather than jumping to an arbitrary theme.
// Aqua Glass has no dark counterpart yet, so it pairs with itself -- the
// quick toggle is a no-op there; the Appearance picker is still the way to
// change theme.
export const THEME_MODE_PAIR: Record<ThemeName, ThemeName> = {
  'neon-aurora': 'spectrum-pop',
  'spectrum-pop': 'neon-aurora',
  'cyber-velvet': 'emerald-fusion',
  'emerald-fusion': 'cyber-velvet',
  'aqua-glass': 'aqua-glass',
  // No dark counterpart yet either -- same no-op quick-toggle treatment as
  // Aqua Glass above.
  'iridescent-glass': 'iridescent-glass',
};
