import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToasts } from '../context/ToastContext';
import { AppNotification } from '../types';
import { BellIcon } from './icons';

function timeAgo(iso: string) {
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

// The dropdown feed here and the floating toast pop-ups (ToastContext) both
// read from the same ToastProvider — one poll, one notifications list, so
// the bell badge and the toasts can never drift out of sync with each
// other the way two independent polling loops could.
export default function NotificationBell() {
  const { isStaff } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, runDailyCheck, runningDailyCheck } = useToasts();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Outside-click/Escape closing via a document listener + ref (not a
  // `fixed inset-0` invisible catcher div) -- a catcher div's `position:
  // fixed` sizes itself against the nearest ancestor with a transform or
  // backdrop-filter (one of the chrome themes puts a real blur on the
  // header this bell lives in), which would shrink it down to the
  // header's own box instead of the full page. This listener approach,
  // already used by UserProfileMenu, doesn't have that failure mode.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function handleOpenNotification(n: AppNotification) {
    if (!n.readAt) await markRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        aria-label="Notifications"
      >
        <BellIcon className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] leading-none rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl shadow-lg z-20">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notifications</span>
              <div className="flex items-center gap-3">
                {isStaff && (
                  <button
                    onClick={runDailyCheck}
                    disabled={runningDailyCheck}
                    title="Run the birthday + document-expiry check now, instead of waiting for the daily 8am run"
                    className="text-xs text-slate-400 hover:text-mitra-accentFrom disabled:opacity-50"
                  >
                    {runningDailyCheck ? 'Running...' : 'Run daily check'}
                  </button>
                )}
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-mitra-accentFrom hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 px-4 py-6 text-center">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleOpenNotification(n)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 ${!n.readAt ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.readAt && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-mitra-accentFrom flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{n.title}</p>
                          {n.body && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>}
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
      )}
    </div>
  );
}
