import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { cancelLeaveRequest, createLeaveRequest, getLeaveBalances, getLeaveRequests, getLeaveTypes } from '../lib/api';
import { LeaveBalance, LeaveRequest, LeaveType } from '../types';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

interface Props {
  employeeId: string;
  title?: string;
}

// Cycled by card index so it scales to however many leave types Settings
// ends up with, rather than hardcoding colors per leave type name.
const CARD_STYLES = [
  { bg: 'bg-blue-50', border: 'border-blue-200', label: 'text-blue-600', value: 'text-blue-900', sub: 'text-blue-500' },
  { bg: 'bg-violet-50', border: 'border-violet-200', label: 'text-violet-600', value: 'text-violet-900', sub: 'text-violet-500' },
  { bg: 'bg-rose-50', border: 'border-rose-200', label: 'text-rose-600', value: 'text-rose-900', sub: 'text-rose-500' },
  { bg: 'bg-amber-50', border: 'border-amber-200', label: 'text-amber-600', value: 'text-amber-900', sub: 'text-amber-500' },
  { bg: 'bg-teal-50', border: 'border-teal-200', label: 'text-teal-600', value: 'text-teal-900', sub: 'text-teal-500' },
  { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', label: 'text-fuchsia-600', value: 'text-fuchsia-900', sub: 'text-fuchsia-500' },
];

// Self-contained "my leave" experience — balances, a request form, and
// history with cancel. Used both as the OTP employee's own page and,
// embedded, as an Admin's personal leave section when their User account
// is linked to an Employee record.
export default function MyLeavePanel({ employeeId, title = 'My Leaves' }: Props) {
  const { token } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', dayPart: 'FULL', reason: '' });

  function load() {
    if (!token || !employeeId) return;
    setLoading(true);
    Promise.all([getLeaveBalances(token, employeeId), getLeaveRequests(token, { employeeId }), getLeaveTypes(token)])
      .then(([b, r, t]) => {
        setBalances(b);
        setRequests(r);
        setLeaveTypes(t.filter((lt) => lt.active));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token, employeeId]);
  useAutoRefresh(load);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');
    setSubmitting(true);
    try {
      await createLeaveRequest(token, { ...form, employeeId });
      setForm({ leaveTypeId: '', startDate: '', endDate: '', dayPart: 'FULL', reason: '' });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id: string) {
    if (!token) return;
    if (!confirm('Cancel this leave request?')) return;
    try {
      await cancelLeaveRequest(token, id);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const sameDay = !!form.startDate && form.startDate === form.endDate;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-800">{title}</h2>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {balances.map((b, i) => {
            const style = CARD_STYLES[i % CARD_STYLES.length];
            return (
              <div key={b.leaveTypeId} className={`${style.bg} border ${style.border} rounded-xl p-4`}>
                <p className={`text-xs font-medium ${style.label}`}>{b.leaveTypeName}</p>
                <p className={`text-2xl font-semibold ${style.value} mt-1`}>{b.remaining == null ? '—' : b.remaining}</p>
                <p className={`text-xs ${style.sub} mt-1`}>
                  {b.remaining == null ? 'Unlimited' : `of ${b.accrued} accrued · ${b.used} used`}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Request Leaves</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Leave Type</label>
            <select
              required
              value={form.leaveTypeId}
              onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select...</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Day Part</label>
            <select
              value={form.dayPart}
              onChange={(e) => setForm({ ...form, dayPart: e.target.value })}
              disabled={!sameDay}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="FULL">Full day</option>
              <option value="FIRST_HALF">First half</option>
              <option value="SECOND_HALF">Second half</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Start Date</label>
            <input
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">End Date</label>
            <input
              type="date"
              required
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Reason</label>
            <textarea
              rows={2}
              required
              minLength={1}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">My Leave Requests</h3>
        {requests.length === 0 ? (
          <p className="text-slate-500 text-sm">No leave requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Dates</th>
                  <th className="pb-2 font-medium">Days</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2">{r.leaveType.name}</td>
                    <td className="py-2 text-slate-600">
                      {r.startDate.slice(0, 10) === r.endDate.slice(0, 10)
                        ? r.startDate.slice(0, 10)
                        : `${r.startDate.slice(0, 10)} → ${r.endDate.slice(0, 10)}`}
                    </td>
                    <td className="py-2">{r.totalDays}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="py-2 text-right">
                      {r.status === 'PENDING' && (
                        <button onClick={() => handleCancel(r.id)} className="text-red-500 hover:text-red-700 text-xs">
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
