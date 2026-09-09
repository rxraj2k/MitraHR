import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  runDailyNotificationCheck,
} from '../lib/api';
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

export default function NotificationBell() {
  const { token, isStaff } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [runningCheck, setRunningCheck] = useState(false);

  async function loadCount() {
    if (!token) return;
    try {
      const { count } = await getUnreadNotificationCount(token);
      setUnreadCount(count);
    } catch {
      // best-effort — a failed poll shouldn't disrupt the page
    }
  }

  async function loadList() {
    if (!token) return;
    try {
      setItems(await getNotifications(token));
    } catch {
      // best-effort
    }
  }

  useEffect(() => {
    loadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useAutoRefresh(loadCount, 20000);

  useEffect(() => {
    if (open) loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleOpenNotification(n: AppNotification) {
    if (!token) return;
    if (!n.readAt) {
      try {
        await markNotificationRead(token, n.id);
      } catch {
        // best-effort
      }
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  async function handleRunDailyCheck() {
    if (!token) return;
    setRunningCheck(true);
    try {
      await runDailyNotificationCheck(token);
      await loadCount();
      await loadList();
    } catch {
      // best-effort
    } finally {
      setRunningCheck(false);
    }
  }

  async function handleMarkAllRead() {
    if (!token) return;
    try {
      await markAllNotificationsRead(token);
    } catch {
      // best-effort
    }
    setItems((list) => list.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
    setUnreadCount(0);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
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
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-20">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white">
              <span className="text-sm font-semibold text-slate-700">Notifications</span>
              <div className="flex items-center gap-3">
                {isStaff && (
                  <button
                    onClick={handleRunDailyCheck}
                    disabled={runningCheck}
                    title="Run the birthday + document-expiry check now, instead of waiting for the daily 8am run"
                    className="text-xs text-slate-400 hover:text-mitra-accentFrom disabled:opacity-50"
                  >
                    {runningCheck ? 'Running...' : 'Run daily check'}
                  </button>
                )}
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-mitra-accentFrom hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-slate-400 px-4 py-6 text-center">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleOpenNotification(n)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${!n.readAt ? 'bg-indigo-50/60' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.readAt && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-mitra-accentFrom flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm text-slate-700 font-medium">{n.title}</p>
                          {n.body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>}
                          <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
