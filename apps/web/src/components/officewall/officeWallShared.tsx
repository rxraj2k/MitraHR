import { OfficeWallCategory, OfficeWallReactionType } from '../../types';

// Shared display constants + small helpers used by the composer, the feed
// card, and the page shell -- kept in one place so category colors, the
// reaction emoji set, and the mention/hashtag renderer never drift apart
// between them.

export const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'General',
  SHOUTOUT: 'Shoutout / Kudos',
  MILESTONE: 'Project Milestone',
  ANNOUNCEMENT: 'Announcement',
  EVENT: 'Event',
};

export const CATEGORY_BADGE: Record<string, string> = {
  GENERAL: 'bg-slate-100 text-slate-600',
  SHOUTOUT: 'bg-amber-100 text-amber-700',
  MILESTONE: 'bg-emerald-100 text-emerald-700',
  ANNOUNCEMENT: 'bg-indigo-100 text-indigo-700',
  EVENT: 'bg-fuchsia-100 text-fuchsia-700',
};

export const REACTION_EMOJI: Record<OfficeWallReactionType, string> = {
  LIKE: '👍',
  HEART: '❤️',
  CELEBRATE: '🎉',
  HANDS_UP: '🙌',
};

export const REACTION_LABELS: Record<OfficeWallReactionType, string> = {
  LIKE: 'Like',
  HEART: 'Love',
  CELEBRATE: 'Celebrate',
  HANDS_UP: 'Hands Up',
};

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Splits a post/comment body into plain text, #hashtag, and @Full Name
// mention segments for rendering. Mentions are matched against the post's
// own confirmed `mentions` list (real employee ids resolved at compose
// time, see OfficeWallComposer) rather than re-parsed blindly from text --
// so a mention only highlights when it's a real, resolved tag.
export interface BodySegment {
  key: string;
  text: string;
  kind: 'text' | 'hashtag' | 'mention';
  employeeId?: string;
}

export function segmentBody(body: string, mentions: { id: string; fullName: string }[]): BodySegment[] {
  const patterns: { re: RegExp; kind: 'hashtag' | 'mention'; employeeId?: string }[] = [
    { re: /#[A-Za-z0-9_]+/g, kind: 'hashtag' },
  ];
  for (const m of mentions) {
    if (!m.fullName) continue;
    const escaped = m.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    patterns.push({ re: new RegExp(`@${escaped}\\b`, 'g'), kind: 'mention', employeeId: m.id });
  }

  // Collect all matches from every pattern, then sort by position and drop
  // any that overlap an earlier (already-claimed) match.
  const matches: { start: number; end: number; kind: 'hashtag' | 'mention'; employeeId?: string; text: string }[] = [];
  for (const p of patterns) {
    let match: RegExpExecArray | null;
    p.re.lastIndex = 0;
    while ((match = p.re.exec(body))) {
      matches.push({ start: match.index, end: match.index + match[0].length, kind: p.kind, employeeId: p.employeeId, text: match[0] });
    }
  }
  matches.sort((a, b) => a.start - b.start);
  const kept: typeof matches = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start < cursor) continue;
    kept.push(m);
    cursor = m.end;
  }

  const segments: BodySegment[] = [];
  let pos = 0;
  kept.forEach((m, i) => {
    if (m.start > pos) segments.push({ key: `t${i}`, text: body.slice(pos, m.start), kind: 'text' });
    segments.push({ key: `m${i}`, text: m.text, kind: m.kind, employeeId: m.employeeId });
    pos = m.end;
  });
  if (pos < body.length) segments.push({ key: 'tend', text: body.slice(pos), kind: 'text' });
  return segments;
}
