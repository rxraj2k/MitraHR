import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { forceEndSession, getLiveActivity } from '../../lib/api';
import { LiveActivity, LiveSessionEntry, LiveSessionStatus } from '../../types';
import { Avatar } from '../Avatar';
import { ClockIcon, LogOutIcon, MapPinIcon, MonitorIcon } from '../icons';

const REFRESH_INTERVAL_MS = 15_000;

const STATUS_DOT: Record<LiveSessionStatus, string> = {
  ACTIVE: 'bg-emerald-500',
  AWAY: 'bg-amber-400',
  LOGGED_OUT: 'bg-slate-300 dark:bg-slate-600',
};

const STATUS_TEXT: Record<LiveSessionStatus, string> = {
  ACTIVE: 'text-emerald-600 dark:text-emerald-400',
  AWAY: 'text-amber-600 dark:text-amber-400',
  LOGGED_OUT: 'text-slate-400 dark:text-slate-500',
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-indigo-100 text-indigo-700',
  HR: 'bg-fuchsia-100 text-fuchsia-700',
  MANAGER: 'bg-sky-100 text-sky-700',
  IT_SUPPORT: 'bg-amber-100 text-amber-700',
  EMPLOYEE: 'bg-slate-100 text-slate-600',
};

function StatusDot({ status }: { status: LiveSessionStatus }) {
  return (
    <span className="relative flex h-2 w-2">
      {status === 'ACTIVE' && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${STATUS_DOT[status]}`} />
    </span>
  );
}

// Real Live User Activity, backed by AdminService.getLiveActivity() and the
// UserSession table (see its model comment) -- not a fabricated "who's
// online" widget. "Away" comes from Security & Authentication's Session
// Idle Timeout setting (now actually enforced here, see that tab). Polls
// every 15s while this tab is open rather than pushing over a websocket --
// there's no push infrastructure in this app, and a 15s-stale admin view is
// a reasonable trade rather than adding one just for this.
export default function AdminLiveActivity() {
  const { token } = useAuth();
  const [data, setData] = useState<LiveActivity | null>(null);
  const [error, setError] = useState('');
  const [endingId, setEndingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    getLiveActivity(token)
      .then(setData)
      .catch((err) => setError(err.message || 'Could not load live activity'));
  }, [token]);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  async function handleForceEnd(session: LiveSessionEntry) {
    if (!token) return;
    if (!confirm(`End ${session.name}'s session right now? They'll be signed out immediately and need to log in again.`)) {
      return;
    }
    setEndingId(session.id);
    setError('');
    try {
      const updated = await forceEndSession(token, session.id);
      setData(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to end session');
    } finally {
      setEndingId(null);
    }
  }

  if (!data) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 dark:bg-slate-900 dark:border-slate-800">
        <p className="text-sm text-slate-400">{error || 'Loading live activity...'}</p>
      </div>
    );
  }

  const { summary, sessions } = data;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Live User Activity</h2>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Real login sessions from the last 24 hours. "Away" triggers after {summary.awayThresholdMin} idle minutes — set
        this on Security &amp; Authentication's Session Idle Timeout. Refreshes automatically every 15 seconds.
      </p>

      {error && <div className="text-xs text-red-600 mb-3">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl p-3.5 bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase opacity-90">Active Now</p>
            <p className="text-2xl font-bold mt-0.5">{summary.activeCount}</p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-white/90" />
        </div>
        <div className="rounded-xl p-3.5 bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase opacity-90">Away / Idle</p>
            <p className="text-2xl font-bold mt-0.5">{summary.awayCount}</p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-white/90" />
        </div>
        <div className="rounded-xl p-3.5 bg-gradient-to-br from-slate-400 to-slate-500 text-white flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase opacity-90">Logged Out (24h)</p>
            <p className="text-2xl font-bold mt-0.5">{summary.loggedOutCount24h}</p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-white/90" />
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-slate-400">No login activity in the last 24 hours.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-3 py-2">Person</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Session Details</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-3 align-top">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-slate-800 dark:text-slate-100 font-medium text-sm truncate">{s.name}</p>
                        <p className="text-slate-400 text-xs truncate">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${ROLE_BADGE[s.role] || 'bg-slate-100 text-slate-600'}`}>
                      {s.role}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={s.status} />
                      <span className={`text-xs font-medium ${STATUS_TEXT[s.status]}`}>{s.statusLabel}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <MonitorIcon className="w-3 h-3 flex-shrink-0" /> {s.device}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPinIcon className="w-3 h-3 flex-shrink-0" /> {s.ipAddress || 'Unknown IP'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ClockIcon className="w-3 h-3 flex-shrink-0" /> Session: {s.durationLabel}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top text-right">
                    {s.canForceEnd ? (
                      <button
                        onClick={() => handleForceEnd(s)}
                        disabled={endingId === s.id}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40 rounded-lg px-2.5 py-1.5 disabled:opacity-50"
                      >
                        <LogOutIcon className="w-3.5 h-3.5" />
                        {endingId === s.id ? 'Ending...' : 'Force End Session'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
