import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAppraisals, runAppraisalCycleCheck, sendAppraisalReminder } from '../lib/api';
import { AdminAppraisalRow, AppraisalStatus } from '../types';
import { Avatar } from './Avatar';
import { MailIcon, ClockIcon, CheckCircleIcon, AwardIcon } from './icons';
import AppraisalReviewDrawer from './AppraisalReviewDrawer';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatMoney(n: number | null) {
  if (n == null) return '-';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

const STATUS_META: Record<AppraisalStatus, { label: string; badge: string; icon: (p: { className?: string }) => JSX.Element }> = {
  PENDING_EMPLOYEE: {
    label: 'Pending Employee',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    icon: MailIcon,
  },
  UNDER_MANAGER_REVIEW: {
    label: 'Under Manager Review',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
    icon: ClockIcon,
  },
  COMPLETED: {
    label: 'Completed',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    icon: CheckCircleIcon,
  },
};

const FILTERS: { key: AppraisalStatus | 'ALL'; label: string; color: string }[] = [
  { key: 'ALL', label: 'All', color: 'bg-mitra-accentFrom' },
  { key: 'PENDING_EMPLOYEE', label: 'Pending Employee', color: 'bg-amber-500' },
  { key: 'UNDER_MANAGER_REVIEW', label: 'Under Review', color: 'bg-sky-500' },
  { key: 'COMPLETED', label: 'Completed', color: 'bg-emerald-500' },
];

// The spec's "Appraisal Management Dashboard" — every employee's current
// cycle, status, self/manager scores and comp outcome in one table, with a
// Review action opening AppraisalReviewDrawer for the side-by-side scoring
// and compensation decision.
export default function AdminAppraisalDashboard() {
  const { token } = useAuth();
  const [rows, setRows] = useState<AdminAppraisalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<AppraisalStatus | 'ALL'>('ALL');
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [runningCheck, setRunningCheck] = useState(false);
  const [runResult, setRunResult] = useState('');
  const [reminderId, setReminderId] = useState<string | null>(null);

  function load() {
    if (!token) return;
    getAppraisals(token)
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  const counts = useMemo(() => {
    const c: Record<AppraisalStatus, number> = { PENDING_EMPLOYEE: 0, UNDER_MANAGER_REVIEW: 0, COMPLETED: 0 };
    rows.forEach((r) => (c[r.status] += 1));
    return c;
  }, [rows]);

  const filtered = filter === 'ALL' ? rows : rows.filter((r) => r.status === filter);

  async function handleRunCheck() {
    if (!token) return;
    setRunningCheck(true);
    setRunResult('');
    try {
      const { triggered, emailed, backlogged } = await runAppraisalCycleCheck(token);
      if (triggered === 0) {
        setRunResult('No cycles due right now.');
      } else {
        // Cycles due within the last couple weeks get emailed right away;
        // anything older (e.g. an employee's join date clearing the
        // 180-day mark long before this feature existed) is added to the
        // backlog without emailing -- see the "Send Reminder" action below.
        const parts: string[] = [];
        if (emailed) parts.push(`${emailed} emailed`);
        if (backlogged) parts.push(`${backlogged} added to backlog, not emailed`);
        setRunResult(`Triggered ${triggered} new cycle${triggered === 1 ? '' : 's'} (${parts.join(', ')}).`);
      }
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunningCheck(false);
    }
  }

  async function handleSendReminder(id: string) {
    if (!token) return;
    setReminderId(id);
    try {
      await sendAppraisalReminder(token, id);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReminderId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-indigo-400 to-indigo-600 text-white">
          <p className="text-[11px] font-semibold uppercase opacity-80">Total in Cycle</p>
          <p className="text-2xl font-bold mt-1">{rows.length}</p>
        </div>
        <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-400 to-orange-500 text-white">
          <p className="text-[11px] font-semibold uppercase opacity-80">Pending Employee</p>
          <p className="text-2xl font-bold mt-1">{counts.PENDING_EMPLOYEE}</p>
        </div>
        <div className="rounded-2xl p-4 bg-gradient-to-br from-sky-400 to-blue-500 text-white">
          <p className="text-[11px] font-semibold uppercase opacity-80">Under Manager Review</p>
          <p className="text-2xl font-bold mt-1">{counts.UNDER_MANAGER_REVIEW}</p>
        </div>
        <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
          <p className="text-[11px] font-semibold uppercase opacity-80">Completed</p>
          <p className="text-2xl font-bold mt-1">{counts.COMPLETED}</p>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs font-semibold rounded-full px-3.5 py-1.5 transition-colors ${
              filter === f.key ? `${f.color} text-white` : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {runResult && <span className="text-xs text-slate-400">{runResult}</span>}
          <button
            onClick={handleRunCheck}
            disabled={runningCheck}
            title="Fires the joining-date cycle check immediately instead of waiting for the 8am scheduled run -- useful for testing"
            className="text-xs font-medium text-slate-500 hover:text-mitra-accentFrom border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 disabled:opacity-50"
          >
            {runningCheck ? 'Running...' : 'Run appraisal check now'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden dark:bg-slate-900 dark:border-slate-800">
        {error && <div className="text-sm text-red-600 px-5 py-3">{error}</div>}
        {loading ? (
          <p className="text-sm text-slate-500 px-5 py-6">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <AwardIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No appraisals in this view.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-5 py-3">Employee</th>
                <th className="px-3 py-3">Cycle</th>
                <th className="px-3 py-3">Due Date</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Self Score</th>
                <th className="px-3 py-3">Manager Score</th>
                <th className="px-3 py-3">Revised CTC</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((r) => {
                const meta = STATUS_META[r.status];
                const Icon = meta.icon;
                return (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.employee.fullName} photoUrl={r.employee.photoUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-700 dark:text-slate-200 truncate">{r.employee.fullName}</p>
                          <p className="text-xs text-slate-400 truncate">{r.employee.designation?.name || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{r.cycleLabel}</td>
                    <td className="px-3 py-3 text-slate-500">{formatDate(r.dueDate)}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 ${meta.badge}`}>
                        <Icon className="w-3 h-3" /> {meta.label}
                      </span>
                      {r.status === 'PENDING_EMPLOYEE' && !r.emailSentAt && (
                        <p className="text-[10px] font-medium text-amber-500 mt-1">Not yet emailed</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{r.selfWeightedScore != null ? `${r.selfWeightedScore.toFixed(1)}/5.0` : '-'}</td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{r.managerWeightedScore != null ? `${r.managerWeightedScore.toFixed(1)}/5.0` : '-'}</td>
                    <td className="px-3 py-3 font-medium text-emerald-600">{formatMoney(r.revisedCTC)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {r.status === 'PENDING_EMPLOYEE' && !r.emailSentAt && (
                          <button
                            onClick={() => handleSendReminder(r.id)}
                            disabled={reminderId === r.id}
                            className="text-xs font-semibold text-amber-600 hover:underline disabled:opacity-50"
                          >
                            {reminderId === r.id ? 'Sending...' : 'Send Reminder'}
                          </button>
                        )}
                        <button
                          onClick={() => setReviewId(r.id)}
                          className="text-xs font-semibold text-mitra-accentFrom hover:underline"
                        >
                          {r.status === 'COMPLETED' ? 'View' : 'Review'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {reviewId && (
        <AppraisalReviewDrawer appraisalId={reviewId} onClose={() => setReviewId(null)} onUpdated={load} />
      )}
    </div>
  );
}
