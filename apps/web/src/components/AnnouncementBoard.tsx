import { useState } from 'react';
import { updateAnnouncement } from '../lib/api';
import { Announcement, LookupItem } from '../types';
import AnnouncementStickyNote from './AnnouncementStickyNote';
import AnnouncementDetailModal from './AnnouncementDetailModal';

// The Announcements corkboard: a wrap of sticky notes, each opening the
// full post on click. Shared by the Organization > Announcements tab (the
// full board) and the Home dashboard / Organization Overview widgets (a
// capped preview via `limit`) -- one place owns the note-grid layout and
// the open/pin/delete wiring so all three surfaces stay in sync.
export default function AnnouncementBoard({
  announcements,
  token,
  isStaff,
  departments,
  onChanged,
  limit,
  emptyMessage,
}: {
  announcements: Announcement[];
  token: string;
  isStaff: boolean;
  departments?: LookupItem[];
  onChanged: () => void;
  limit?: number;
  emptyMessage?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [pinBusyId, setPinBusyId] = useState<string | null>(null);

  const shown = typeof limit === 'number' ? announcements.slice(0, limit) : announcements;
  const open = announcements.find((a) => a.id === openId) || null;

  async function togglePin(a: Announcement) {
    if (pinBusyId) return;
    setPinBusyId(a.id);
    try {
      await updateAnnouncement(token, a.id, { pinned: !a.pinned });
      onChanged();
    } finally {
      setPinBusyId(null);
    }
  }

  if (shown.length === 0) {
    return <p className="text-sm text-slate-400">{emptyMessage || 'No announcements right now.'}</p>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-5">
        {shown.map((a) => (
          <AnnouncementStickyNote
            key={a.id}
            announcement={a}
            isStaff={isStaff}
            onOpen={() => setOpenId(a.id)}
            onTogglePin={isStaff ? () => togglePin(a) : undefined}
          />
        ))}
      </div>

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
