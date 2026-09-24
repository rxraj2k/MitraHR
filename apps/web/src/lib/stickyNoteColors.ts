// Sticky-note palette for the Announcements board (Organization tab and the
// Home/Dashboard preview). Keys must match STICKY_COLORS in
// apps/api/src/announcements/announcements.service.ts, which assigns one at
// random server-side whenever an announcement is created -- the frontend
// only ever renders whichever key comes back, it never picks one itself.
export interface StickyNoteStyle {
  bg: string;
  border: string;
  tape: string;
}

export const STICKY_NOTE_STYLES: Record<string, StickyNoteStyle> = {
  yellow: { bg: 'bg-yellow-200', border: 'border-yellow-300', tape: 'bg-yellow-300/70' },
  pink: { bg: 'bg-pink-200', border: 'border-pink-300', tape: 'bg-pink-300/70' },
  blue: { bg: 'bg-sky-200', border: 'border-sky-300', tape: 'bg-sky-300/70' },
  green: { bg: 'bg-lime-200', border: 'border-lime-300', tape: 'bg-lime-300/70' },
  orange: { bg: 'bg-orange-200', border: 'border-orange-300', tape: 'bg-orange-300/70' },
  purple: { bg: 'bg-purple-200', border: 'border-purple-300', tape: 'bg-purple-300/70' },
  teal: { bg: 'bg-teal-200', border: 'border-teal-300', tape: 'bg-teal-300/70' },
};

const DEFAULT_STYLE: StickyNoteStyle = STICKY_NOTE_STYLES.yellow;

export function stickyNoteStyle(color?: string | null): StickyNoteStyle {
  return (color && STICKY_NOTE_STYLES[color]) || DEFAULT_STYLE;
}

// A small, deterministic "scattered on a corkboard" tilt per note, derived
// from its id so it stays put across re-renders instead of jittering every
// time the board refetches.
export function stickyNoteTilt(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  // Range roughly -3deg to +3deg.
  return ((Math.abs(hash) % 13) - 6) * 0.5;
}

// Category values that should carry the "Important" badge on the board and
// in the expanded view (see CATEGORIES in AnnouncementsTab.tsx).
export function isImportantCategory(category?: string | null): boolean {
  return category === 'Urgent' || category === 'Policy';
}
