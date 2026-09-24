import { Announcement } from '../types';
import { isImportantCategory, stickyNoteStyle, stickyNoteTilt } from '../lib/stickyNoteColors';

// Strips the rich-text HTML AnnouncementsTab stores (`.body`) down to a
// short plain-text snippet that fits a small paper note -- the full
// formatted post only renders once the note is opened.
function plainTextPreview(html: string, maxLength = 110): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

// One sticky note on the Announcements corkboard (Organization tab and the
// Home/Dashboard preview share this exact card). Clicking anywhere on the
// note opens the full announcement; the pin control is its own button so
// staff can pin/unpin without opening it. Pin is a global, staff-only flag
// -- an employee viewing the board sees the 📌 indicator on pinned notes
// but has no control to change it, matching the update endpoint's
// staff-only guard on the backend.
export default function AnnouncementStickyNote({
  announcement,
  isStaff,
  onOpen,
  onTogglePin,
}: {
  announcement: Announcement;
  isStaff: boolean;
  onOpen: () => void;
  onTogglePin?: () => void;
}) {
  const style = stickyNoteStyle(announcement.color);
  const tilt = stickyNoteTilt(announcement.id);
  const important = isImportantCategory(announcement.category);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      style={{ transform: `rotate(${tilt}deg)` }}
      className={`relative text-left w-full sm:w-56 h-48 flex-shrink-0 cursor-pointer ${style.bg} border ${style.border} rounded-sm shadow-md hover:shadow-xl hover:-translate-y-1 hover:z-10 transition-all duration-150 p-4 flex flex-col`}
    >
      <span
        aria-hidden
        style={{ transform: 'translateX(-50%) rotate(-2deg)' }}
        className={`absolute -top-2 left-1/2 w-12 h-4 rounded-sm ${style.tape} shadow-sm`}
      />

      <div className="flex items-start justify-between gap-1 mb-1.5 min-h-[18px]">
        {important ? (
          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-rose-600 text-white shadow-sm">
            Important
          </span>
        ) : (
          <span />
        )}
        {isStaff && onTogglePin ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            title={announcement.pinned ? 'Unpin' : 'Pin to dashboard'}
            className={`text-sm leading-none flex-shrink-0 ${
              announcement.pinned ? 'opacity-100' : 'opacity-30 hover:opacity-70'
            }`}
          >
            📌
          </button>
        ) : (
          announcement.pinned && (
            <span className="text-sm leading-none flex-shrink-0" title="Pinned">
              📌
            </span>
          )
        )}
      </div>

      <h4 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 mb-1.5">{announcement.title}</h4>
      <p className="text-xs text-slate-700/80 leading-snug line-clamp-4 flex-1">{plainTextPreview(announcement.body)}</p>
      <p className="text-[10px] text-slate-600/70 mt-2 truncate">
        {announcement.createdByName} · {new Date(announcement.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}
