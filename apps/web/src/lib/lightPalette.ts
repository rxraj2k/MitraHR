// A cycling set of very light, pastel card surfaces -- used wherever a list
// of same-shape items (a project, an asset, a document) reads better as a
// row of distinct light-tinted boxes than as one more table. Colors are
// assigned by position (index % length), not by any meaning in the data --
// this is pure visual variety, the same spirit as lib/tileThemes.ts's
// saturated 3D tiles, just toned all the way down to a soft, easy-on-the-
// eyes tint instead of a bold gradient.
export interface LightCardTheme {
  bg: string;
  border: string;
}

export const LIGHT_CARD_THEMES: LightCardTheme[] = [
  { bg: 'bg-violet-50 dark:bg-violet-950/20', border: 'border-violet-100 dark:border-violet-900/40' },
  { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-100 dark:border-blue-900/40' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-100 dark:border-emerald-900/40' },
  { bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-100 dark:border-amber-900/40' },
  { bg: 'bg-rose-50 dark:bg-rose-950/20', border: 'border-rose-100 dark:border-rose-900/40' },
  { bg: 'bg-teal-50 dark:bg-teal-950/20', border: 'border-teal-100 dark:border-teal-900/40' },
  { bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/20', border: 'border-fuchsia-100 dark:border-fuchsia-900/40' },
  { bg: 'bg-cyan-50 dark:bg-cyan-950/20', border: 'border-cyan-100 dark:border-cyan-900/40' },
  { bg: 'bg-lime-50 dark:bg-lime-950/20', border: 'border-lime-100 dark:border-lime-900/40' },
  { bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-100 dark:border-orange-900/40' },
];

export function lightThemeFor(index: number): LightCardTheme {
  return LIGHT_CARD_THEMES[((index % LIGHT_CARD_THEMES.length) + LIGHT_CARD_THEMES.length) % LIGHT_CARD_THEMES.length];
}
