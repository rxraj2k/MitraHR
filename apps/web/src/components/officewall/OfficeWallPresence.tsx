import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { getOfficeWallOnline } from '../../lib/api';
import { OfficeWallPresenceEntry } from '../../types';
import { Avatar } from '../Avatar';

// "Who's Online Now" -- reads the same UserSession-backed presence signal
// as Admin Center's Live User Activity (a real, revocable login session
// within the Session Idle Timeout window), just exposed here as a plain
// name/photo/department list with no session-management actions, which
// stay Admin-only.
export default function OfficeWallPresence({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const { token } = useAuth();
  const [online, setOnline] = useState<OfficeWallPresenceEntry[] | null>(null);

  function load() {
    if (!token) return;
    getOfficeWallOnline(token)
      .then((rows) => {
        setOnline(rows);
        onCountChange?.(rows.length);
      })
      .catch(() => {});
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);
  useAutoRefresh(load, 15000);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Who's Online Now</h3>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 rounded-full px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {online?.length ?? '—'} Online
        </span>
      </div>
      {online === null ? (
        <p className="text-xs text-slate-400">Loading...</p>
      ) : online.length === 0 ? (
        <p className="text-xs text-slate-400">Nobody else is online right now.</p>
      ) : (
        <ul className="space-y-2.5 max-h-80 overflow-y-auto">
          {online.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5">
              <div className="relative flex-shrink-0">
                <Avatar name={p.fullName} photoUrl={p.photoUrl} size="sm" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{p.fullName}</p>
                {(p.department || p.designation) && (
                  <p className="text-[11px] text-slate-400 truncate">{[p.designation, p.department].filter(Boolean).join(' · ')}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
