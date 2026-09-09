import { FormEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import {
  cancelLeaveRequest,
  createCompOffEntry,
  createLeaveRequest,
  getCompOffEntries,
  getLeaveBalances,
  getLeaveRequests,
  getLeaveTypes,
  openAuthedFile,
  uploadLeaveAttachment,
} from '../lib/api';
import { CompOffEntry, LeaveBalance, LeaveRequest, LeaveType } from '../types';

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

function accrualDescription(lt: LeaveType) {
  if (lt.isCompOff) return 'Earned by logging extra days worked, approved by admin';
  if (lt.accrualMethod === 'NONE' || lt.annualQuota == null) return 'Unlimited, no balance tracked';
  if (lt.accrualMethod === 'UPFRONT') return `Full ${lt.annualQuota} day${lt.annualQuota === 1 ? '' : 's'} available from day one`;
  return `${lt.annualQuota} days/year, credited 1/12th per completed month`;
}

// Self-contained "my leave" experience — balances, a request form, comp-off
// tracking, policy reference, and history with cancel. Used both as the OTP
// employee's own page and, embedded, as an Admin's personal leave section
// when their User account is linked to an Employee record.
export default function MyLeavePanel({ employeeId, title = 'My Leaves' }: Props) {
  const { token } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [compOffEntries, setCompOffEntries] = useState<CompOffEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', dayPart: 'FULL', reason: '' });
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachingId, setAttachingId] = useState<string | null>(null);

  const [compOffForm, setCompOffForm] = useState({ workedDate: '', reason: '', daysEarned: '1' });
  const [compOffSubmitting, setCompOffSubmitting] = useState(false);
  const [compOffMessage, setCompOffMessage] = useState('');

  function load() {
    if (!token || !employeeId) return;
    setLoading(true);
    Promise.all([
      getLeaveBalances(token, employeeId),
      getLeaveRequests(token, { employeeId }),
      getLeaveTypes(token),
      getCompOffEntries(token, { employeeId }),
    ])
      .then(([b, r, t, c]) => {
        setBalances(b);
        setRequests(r);
        setLeaveTypes(t.filter((lt) => lt.active));
        setCompOffEntries(c);
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
      const created = await createLeaveRequest(token, { ...form, employeeId });
      if (attachFile) {
        try {
          await uploadLeaveAttachment(token, created.id, attachFile);
        } catch (attachErr: any) {
          setError(`Request submitted, but the attachment failed to upload: ${attachErr.message}`);
        }
      }
      setForm({ leaveTypeId: '', startDate: '', endDate: '', dayPart: 'FULL', reason: '' });
      setAttachFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  async function handleAttachExisting(id: string, file: File) {
    if (!token) return;
    setAttachingId(id);
    try {
      await uploadLeaveAttachment(token, id, file);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAttachingId(null);
    }
  }

  async function handleCompOffSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCompOffMessage('');
    setCompOffSubmitting(true);
    try {
      await createCompOffEntry(token, {
        workedDate: compOffForm.workedDate,
        reason: compOffForm.reason,
        daysEarned: Number(compOffForm.daysEarned) || 1,
      });
      setCompOffForm({ workedDate: '', reason: '', daysEarned: '1' });
      setCompOffMessage('Logged — pending admin approval.');
      load();
    } catch (err: any) {
      setCompOffMessage(err.message);
    } finally {
      setCompOffSubmitting(false);
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
            <label className="block text-xs text-slate-500 mb-1">
              Supporting document <span className="text-slate-400">(optional — e.g. medical certificate)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setAttachFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-600 hover:file:bg-slate-200"
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
                  <th className="pb-2 font-medium">Document</th>
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
                    <td className="py-2">
                      {r.attachmentUrl ? (
                        <button
                          type="button"
                          onClick={() => token && openAuthedFile(token, `/leave-requests/${r.id}/attachment`)}
                          className="text-mitra-accentFrom hover:underline text-xs"
                        >
                          View
                        </button>
                      ) : r.status === 'CANCELLED' ? (
                        <span className="text-slate-300 text-xs">—</span>
                      ) : (
                        <label className="text-xs text-slate-400 hover:text-mitra-accentFrom cursor-pointer">
                          {attachingId === r.id ? 'Uploading...' : 'Attach'}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            disabled={attachingId === r.id}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleAttachExisting(r.id, f);
                            }}
                          />
                        </label>
                      )}
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

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Compensatory Off</h3>
        <p className="text-xs text-slate-500 mb-4">
          Worked an extra weekend or holiday? Log it here — once an admin approves it, the day is added to your
          Compensatory Off balance above and you can request it back as time off.
        </p>
        {compOffMessage && <div className="text-sm text-slate-600 mb-3">{compOffMessage}</div>}
        <form onSubmit={handleCompOffSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Date Worked</label>
            <input
              type="date"
              required
              max={new Date().toISOString().slice(0, 10)}
              value={compOffForm.workedDate}
              onChange={(e) => setCompOffForm({ ...compOffForm, workedDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Days Earned</label>
            <select
              value={compOffForm.daysEarned}
              onChange={(e) => setCompOffForm({ ...compOffForm, daysEarned: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="1">Full day</option>
              <option value="0.5">Half day</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Reason</label>
            <input
              required
              minLength={1}
              value={compOffForm.reason}
              onChange={(e) => setCompOffForm({ ...compOffForm, reason: e.target.value })}
              placeholder="e.g. Weekend production deployment"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-4">
            <button
              type="submit"
              disabled={compOffSubmitting}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {compOffSubmitting ? 'Logging...' : 'Log Day Worked'}
            </button>
          </div>
        </form>

        {compOffEntries.length === 0 ? (
          <p className="text-slate-500 text-sm">No comp-off entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Date Worked</th>
                  <th className="pb-2 font-medium">Days</th>
                  <th className="pb-2 font-medium">Reason</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {compOffEntries.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2">{c.workedDate.slice(0, 10)}</td>
                    <td className="py-2">{c.daysEarned}</td>
                    <td className="py-2 text-slate-500 max-w-[200px] truncate" title={c.reason}>
                      {c.reason}
                    </td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Leave Policy</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Paid</th>
                <th className="pb-2 font-medium">How it works</th>
                <th className="pb-2 font-medium">Carry Forward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaveTypes.map((lt) => (
                <tr key={lt.id}>
                  <td className="py-2 font-medium text-slate-700">{lt.name}</td>
                  <td className="py-2 text-slate-500">{lt.isPaid ? 'Paid' : 'Unpaid'}</td>
                  <td className="py-2 text-slate-500">{accrualDescription(lt)}</td>
                  <td className="py-2 text-slate-500">{lt.carryForwardAllowed ? 'Yes' : 'No, resets yearly'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
