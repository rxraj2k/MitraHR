import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  runDailyNotificationCheck,
} from '../lib/api';
import { AppNotification } from '../types';
import {
  BellIcon,
  CakeIcon,
  CheckCircleIcon,
  ClockIcon,
  ExternalLinkIcon,
  ShieldIcon,
  XIcon,
} from '../components/icons';

const POPUP_PREF_KEY = 'mitrahr_popup_notifications_enabled';
const SOUND_PREF_KEY = 'mitrahr_sound_alerts_enabled';
const MAX_VISIBLE_TOASTS = 4;
const TOAST_DURATION_MS = 5000;
const POLL_INTERVAL_MS = 20000; // same cadence NotificationBell already polled at

function readBoolPref(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === 'true') return true;
    if (v === 'false') return false;
  } catch {
    // localStorage unavailable (private browsing, etc.) — fall through
  }
  return fallback;
}

function writeBoolPref(key: string, value: boolean) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // best-effort — a per-device UI preference not persisting isn't worth surfacing an error for
  }
}

// A short, synthesized two-tone chime via the Web Audio API. There's no
// bundled audio asset in this app, and generating one avoids sourcing or
// licensing a real sound file for what's meant to be "subtle" background
// feedback anyway. Browsers block audio playback before the person has
// interacted with the page at all (click, keypress) — this silently
// no-ops in that case rather than throwing, which is a real browser
// autoplay restriction, not a bug to work around.
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.09;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
    setTimeout(() => ctx.close(), 700);
  } catch {
    // best-effort — unsupported browser, autoplay restrictions, etc.
  }
}

// Best-effort categorization of the app's existing notification `type`
// values into the four visual families requested, plus a neutral fallback
// for anything unmapped (including any future type nobody's themed yet —
// this list was never designed around these four buckets, so treat it as
// a reasonable default grouping, not a strict taxonomy).
type ToastTheme = 'celebration' | 'security' | 'reminder' | 'success' | 'neutral';

const THEME_BY_TYPE: Record<string, ToastTheme> = {
  BIRTHDAY: 'celebration',
  RECOGNITION_RECEIVED: 'celebration',
  NEW_LOGIN: 'security',
  APPRAISAL_DUE: 'reminder',
  APPRAISAL_SUBMITTED: 'reminder',
  APPRAISAL_FINALIZED: 'reminder',
  LEAVE_SUBMITTED: 'reminder',
  LEAVE_EDITED: 'reminder',
  LEAVE_DECIDED: 'reminder',
  LEAVE_CANCELLED: 'reminder',
  COMP_OFF_SUBMITTED: 'reminder',
  COMP_OFF_DECIDED: 'reminder',
  DOCUMENT_EXPIRING: 'reminder',
  CONTRACT_EXPIRING: 'reminder',
  ACCESS_REVOCATION_DUE: 'reminder',
  EXIT_INITIATED: 'reminder',
  EXIT_COMPLETED: 'reminder',
  PULSE_SURVEY_LAUNCHED: 'reminder',
  QUIZ_RESULT: 'success',
  ASSET_ASSIGNED: 'success',
  // Office Wall
  OFFICE_WALL_POST: 'neutral',
  OFFICE_WALL_MENTION: 'celebration',
  OFFICE_WALL_LIKE: 'success',
  OFFICE_WALL_COMMENT: 'reminder',
  OFFICE_WALL_SHARE: 'celebration',
  TRAINING_ASSIGNED: 'success',
  PROJECT_ASSIGNED: 'success',
  PROJECT_ASSIGNMENT_ENDED: 'success',
};

const THEME_STYLES: Record<ToastTheme, { card: string; icon: JSX.Element; iconWrap: string }> = {
  celebration: {
    card: 'bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 text-white',
    iconWrap: 'bg-white/20',
    icon: <CakeIcon className="w-5 h-5" />,
  },
  security: {
    card: 'bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-900 text-slate-800 dark:text-slate-100',
    iconWrap: 'bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400',
    icon: <ShieldIcon className="w-5 h-5" />,
  },
  reminder: {
    card: 'bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 text-slate-800 dark:text-slate-100',
    iconWrap: 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
    icon: <ClockIcon className="w-5 h-5" />,
  },
  success: {
    card: 'bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 text-slate-800 dark:text-slate-100',
    iconWrap: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
    icon: <CheckCircleIcon className="w-5 h-5" />,
  },
  neutral: {
    card: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100',
    iconWrap: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
    icon: <BellIcon className="w-5 h-5" />,
  },
};

interface ToastItem extends AppNotification {
  _toastId: string;
}

interface ToastContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  runDailyCheck: () => Promise<void>;
  runningDailyCheck: boolean;
  popupsEnabled: boolean;
  setPopupsEnabled: (value: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function ToastCard({ toast, onDismiss, onAction }: { toast: ToastItem; onDismiss: () => void; onAction: () => void }) {
  const theme = THEME_STYLES[THEME_BY_TYPE[toast.type] || 'neutral'];
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);
  // Bumped every time the dismiss timer (re)starts, and used as the
  // progress-bar element's React key -- remounting it is what restarts its
  // CSS animation from 100% again, so the bar always stays in lockstep with
  // the actual JS timeout instead of resuming a paused, partially-drained
  // animation against a freshly-reset (full-length) timer after a hover.
  const [tick, setTick] = useState(0);

  const schedule = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(onDismiss, TOAST_DURATION_MS);
    setTick((t) => t + 1);
  }, [onDismiss]);

  useEffect(() => {
    schedule();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      onMouseEnter={() => {
        setPaused(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }}
      onMouseLeave={() => {
        setPaused(false);
        schedule();
      }}
      className={`relative w-80 rounded-2xl shadow-xl overflow-hidden animate-[toastSlideIn_0.25s_ease-out] ${theme.card}`}
      role="alert"
    >
      <div className="flex items-start gap-3 p-4 pr-8">
        <span className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${theme.iconWrap}`}>
          {theme.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{toast.title}</p>
          {toast.body && <p className="text-xs opacity-90 mt-0.5 leading-snug line-clamp-3">{toast.body}</p>}
          {toast.link && (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-1 text-xs font-semibold mt-2 opacity-90 hover:opacity-100 underline underline-offset-2"
            >
              View Details <ExternalLinkIcon className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute top-2.5 right-2.5 opacity-70 hover:opacity-100 rounded-full p-1"
      >
        <XIcon className="w-3.5 h-3.5" />
      </button>
      <div className="h-1 bg-black/10">
        <div
          key={tick}
          className="h-full bg-current opacity-40"
          style={{
            animation: `toastProgress ${TOAST_DURATION_MS}ms linear forwards`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      </div>
    </div>
  );
}

function ToastStack({
  toasts,
  onDismiss,
  onAction,
}: {
  toasts: ToastItem[];
  onDismiss: (toastId: string) => void;
  onAction: (toast: ToastItem) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div key={t._toastId} className="pointer-events-auto">
          <ToastCard toast={t} onDismiss={() => onDismiss(t._toastId)} onAction={() => onAction(t)} />
        </div>
      ))}
    </div>
  );
}

// Single source of truth for notifications, shared by NotificationBell (the
// header dropdown) and this file's floating toast pop-ups, so the two stay
// synchronized by construction rather than by coincidence -- both read from
// the same poll instead of running two independent ones. There's no
// websocket/push in this app (see useAutoRefresh's own comment on why), so
// "real-time" here means polling every 20s plus an immediate re-check on
// tab focus, the same mechanism every other live-ish view in MitraHR uses.
//
// New-toast detection: the notification list is diffed against the ids
// already seen. The very first load after mount/login only seeds that set
// -- it doesn't toast anything, since none of it is actually "new," it's
// just "not yet seen by this browser tab." Only notifications that appear
// on a LATER poll pop up.
export function ToastProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [runningDailyCheck, setRunningDailyCheck] = useState(false);
  const [popupsEnabled, setPopupsEnabledState] = useState(() => readBoolPref(POPUP_PREF_KEY, true));
  const [soundEnabled, setSoundEnabledState] = useState(() => readBoolPref(SOUND_PREF_KEY, false));
  const [activeToasts, setActiveToasts] = useState<ToastItem[]>([]);
  const seenIds = useRef<Set<string> | null>(null);
  const prefsRef = useRef({ popupsEnabled, soundEnabled });
  prefsRef.current = { popupsEnabled, soundEnabled };

  function setPopupsEnabled(value: boolean) {
    setPopupsEnabledState(value);
    writeBoolPref(POPUP_PREF_KEY, value);
  }
  function setSoundEnabled(value: boolean) {
    setSoundEnabledState(value);
    writeBoolPref(SOUND_PREF_KEY, value);
  }

  const dismissToast = useCallback((toastId: string) => {
    setActiveToasts((list) => list.filter((t) => t._toastId !== toastId));
  }, []);

  const load = useCallback(() => {
    if (!token) return;
    getNotifications(token)
      .then((list) => {
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.readAt).length);

        if (seenIds.current === null) {
          seenIds.current = new Set(list.map((n) => n.id));
        } else {
          const fresh = list.filter((n) => !seenIds.current!.has(n.id) && !n.readAt);
          list.forEach((n) => seenIds.current!.add(n.id));
          if (fresh.length > 0 && prefsRef.current.popupsEnabled) {
            setActiveToasts((current) => {
              const additions: ToastItem[] = fresh.map((n) => ({ ...n, _toastId: `${n.id}-${Date.now()}` }));
              return [...additions, ...current].slice(0, MAX_VISIBLE_TOASTS);
            });
            if (prefsRef.current.soundEnabled) playChime();
          }
        }
      })
      .catch(() => {
        // best-effort — a failed poll shouldn't disrupt the page
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    seenIds.current = null; // re-seed whenever the signed-in account changes
    setActiveToasts([]);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useAutoRefresh(load, POLL_INTERVAL_MS);

  async function markRead(id: string) {
    if (!token) return;
    try {
      await markNotificationRead(token, id);
    } catch {
      // best-effort
    }
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    if (!token) return;
    try {
      await markAllNotificationsRead(token);
    } catch {
      // best-effort
    }
    setNotifications((list) => list.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    setUnreadCount(0);
  }

  async function runDailyCheck() {
    if (!token) return;
    setRunningDailyCheck(true);
    try {
      await runDailyNotificationCheck(token);
      load();
    } catch {
      // best-effort
    } finally {
      setRunningDailyCheck(false);
    }
  }

  function handleToastAction(toast: ToastItem) {
    dismissToast(toast._toastId);
    if (!toast.readAt) markRead(toast.id);
    if (toast.link) navigate(toast.link);
  }

  return (
    <ToastContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markRead,
        markAllRead,
        runDailyCheck,
        runningDailyCheck,
        popupsEnabled,
        setPopupsEnabled,
        soundEnabled,
        setSoundEnabled,
      }}
    >
      {children}
      <ToastStack toasts={activeToasts} onDismiss={dismissToast} onAction={handleToastAction} />
    </ToastContext.Provider>
  );
}

export function useToasts() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts must be used within ToastProvider');
  return ctx;
}
