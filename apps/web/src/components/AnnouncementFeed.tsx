import { useState } from 'react';
import { Announcement, LookupItem } from '../types';
import { isImportantCategory } from '../lib/stickyNoteColors';
import AnnouncementDetailModal from './AnnouncementDetailModal';

// A compact feed replacement for the corkboard-style AnnouncementBoard, used
// only on the Home dashboard where the oversized sticky notes ate too much
// vertical space. The full board (AnnouncementBoard/AnnouncementStickyNote)
// is untouched and still lives on Organization > Announcements -- this is a
// second, slimmer presentation of the same data, not a replacement for it.
function timeAgo(iso: string): string {
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

function plainTextPreview(html: string, maxLength = 84): string {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

// Deterministic per-author avatar color -- same idea as stickyNoteTilt's id
// hash, just keyed on the author's name so the same person's initials
// always land on the same color instead of jittering per render.
const AVATAR_COLORS = ['bg-indigo-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500', 'bg-teal-500'];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function AnnouncementFeed({
  announcements,
  token,
  isStaff,
  departments,
  onChanged,
  limit = 8,
}: {
  announcements: Announcement[];
  token: string;
  isStaff: boolean;
  departments?: LookupItem[];
  onChanged: () => void;
  limit?: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const shown = announcements.slice(0, limit);
  const open = announcements.find((a) => a.id === openId) || null;

  if (shown.length === 0) {
    return <p className="text-sm text-slate-400">No announcements right now.</p>;
  }

  return (
    <>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto pr-1">
        {shown.map((a) => {
          const important = isImportantCategory(a.category);
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setOpenId(a.id)}
                className="w-full flex items-start gap-3 py-2.5 px-2 -mx-2 text-left rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0 mt-0.5 ${avatarColor(a.createdByName)}`}
                >
                  {initials(a.createdByName) || '?'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0 ${
                        important
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          : 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400'
                      }`}
                    >
                      {important ? 'Important' : a.category || 'Update'}
                    </span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{a.title}</span>
                    {a.pinned && <span className="text-[10px] text-amber-500 flex-shrink-0">📌</span>}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate block mt-0.5">{plainTextPreview(a.body)}</span>
                </span>
                <span className="flex-shrink-0 text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap mt-0.5">
                  {timeAgo(a.createdAt)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {open && (
        <AnnouncementDetailModal
          announcement={open}
          token={token}
          isStaff={isStaff}
          departments={departments}
          onClose={() => setOpenId(null)}
          onChanged={onChanged}
        />
      )}
    </>
  );
}
