import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
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
  updateLeaveRequest,
  uploadLeaveAttachment,
} from '../lib/api';
import { CompOffEntry, LeaveBalance, LeaveRequest, LeaveType } from '../types';
import FileDropzone from './FileDropzone';
import { CalendarCheckIcon, ChevronDownIcon, ClipboardListIcon, EyeIcon, PaperclipIcon } from './icons';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-500 text-white',
  APPROVED: 'bg-emerald-500 text-white',
  REJECTED: 'bg-red-500 text-white',
  CANCELLED: 'bg-slate-400 text-white',
};

interface Props {
  employeeId: string;
  title?: string;
  // When this panel is embedded on a page that renders the balance cards
  // separately (see MyLeaveBalanceCards), hide the panel's own copy so
  // "My Leaves" doesn't appear twice.
  hideBalances?: boolean;
  // Bumping this (new object identity, e.g. { id, nonce: Date.now() })
  // pre-selects that leave type on the Request Leaves form and scrolls it
  // into view -- how a balance card click elsewhere on the page lands the
  // admin here ready to act, even on a repeat click of the same type.
  prefillLeaveType?: { id: string; nonce: number } | null;
}

interface CardStyle {
  bg: string;
  border: string;
  label: string;
  value: string;
  sub: string;
  bar: string;
}

// Each recognized leave-type code gets its own soft gradient identity —
// blue for Paid Leave, gray for Loss of Pay, teal for Comp Off, and a
// distinct family-leave pair for Maternity/Paternity (see
// GENDER_SPECIFIC_CODES below — those two are collapsed behind a "show
// more" toggle by default, since there's no gender field anywhere in this
// schema to filter them automatically; the toggle is the honest
// alternative rather than a fabricated filter).
const CARD_STYLE_BY_CODE: Record<string, CardStyle> = {
  PL: {
    bg: 'bg-gradient-to-br from-sky-50 to-blue-100/70',
    border: 'border-blue-200/70',
    label: 'text-blue-700',
    value: 'text-blue-900',
    sub: 'text-blue-500',
    bar: 'bg-blue-500',
  },
  LOP: {
    bg: 'bg-gradient-to-br from-slate-50 to-slate-200/60',
    border: 'border-slate-200',
    label: 'text-slate-600',
    value: 'text-slate-800',
    sub: 'text-slate-400',
    bar: 'bg-slate-400',
  },
  COMP_OFF: {
    bg: 'bg-gradient-to-br from-teal-50 to-emerald-100/70',
    border: 'border-teal-200/70',
    label: 'text-teal-700',
    value: 'text-teal-900',
    sub: 'text-teal-500',
    bar: 'bg-teal-500',
  },
  MATERNITY: {
    bg: 'bg-gradient-to-br from-rose-50 to-pink-100/70',
    border: 'border-rose-200/70',
    label: 'text-rose-700',
    value: 'text-rose-900',
    sub: 'text-rose-500',
    bar: 'bg-rose-500',
  },
  PATERNITY: {
    bg: 'bg-gradient-to-br from-indigo-50 to-violet-100/70',
    border: 'border-indigo-200/70',
    label: 'text-indigo-700',
    value: 'text-indigo-900',
    sub: 'text-indigo-500',
    bar: 'bg-indigo-500',
  },
};

// Any future leave type Settings adds without a recognized code cycles
// through this fallback set rather than falling back to one neutral style.
const FALLBACK_CARD_STYLES: CardStyle[] = [
  {
    bg: 'bg-gradient-to-br from-violet-50 to-purple-100/70',
    border: 'border-violet-200/70',
    label: 'text-violet-700',
    value: 'text-violet-900',
    sub: 'text-violet-500',
    bar: 'bg-violet-500',
  },
  {
    bg: 'bg-gradient-to-br from-amber-50 to-orange-100/70',
    border: 'border-amber-200/70',
    label: 'text-amber-700',
    value: 'text-amber-900',
    sub: 'text-amber-500',
    bar: 'bg-amber-500',
  },
  {
    bg: 'bg-gradient-to-br from-fuchsia-50 to-pink-100/70',
    border: 'border-fuchsia-200/70',
    label: 'text-fuchsia-700',
    value: 'text-fuchsia-900',
    sub: 'text-fuchsia-500',
    bar: 'bg-fuchsia-500',
  },
];

export function cardStyleFor(code: string | null | undefined, fallbackIndex: number): CardStyle {
  if (code && CARD_STYLE_BY_CODE[code]) return CARD_STYLE_BY_CODE[code];
  return FALLBACK_CARD_STYLES[fallbackIndex % FALLBACK_CARD_STYLES.length];
}

// Collapsed behind "show more" by default — see the comment on
// CARD_STYLE_BY_CODE above for why this is a code-based toggle rather than
// a gender-based filter.
export const GENDER_SPECIFIC_CODES = new Set(['MATERNITY', 'PATERNITY']);

const inputClass =
  'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitra-accentFrom/20 focus:border-mitra-accentFrom transition-colors';

// `compact` is the tighter sizing used everywhere "My Leaves" now renders
// (both here and in the standalone MyLeaveBalanceCards grid) so all of an
// employee's leave-type cards fit on one row instead of wrapping.
export function LeaveBalanceCard({ balance, style, compact }: { balance: LeaveBalance; style: CardStyle; compact?: boolean }) {
  const pct =
    balance.remaining != null && balance.accrued
      ? Math.max(0, Math.min(100, (balance.remaining / balance.accrued) * 100))
      : null;
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${style.border} ${style.bg} ${
        compact ? 'p-3' : 'p-4'
      } shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]`}
    >
      <p className={`text-xs font-medium ${style.label} truncate`}>{balance.leaveTypeName}</p>
      <div className="flex items-baseline gap-1.5 mt-1">
        <p className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold ${style.value}`}>{balance.remaining == null ? '—' : balance.remaining}</p>
        {balance.remaining != null && <span className={`text-[11px] ${style.sub}`}>/ {balance.accrued} days</span>}
      </div>
      <p className={`text-[11px] ${style.sub} mt-1`}>{balance.remaining == null ? 'Unlimited' : `${balance.used} used`}</p>
      {pct != null && (
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-2 h-1.5 rounded-full bg-white/60 overflow-hidden shadow-inner"
        >
          <div className={`h-full rounded-full ${style.bar} shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

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
export default function MyLeavePanel({ employeeId, title = 'My Leaves', hideBalances, prefillLeaveType }: Props) {
  const { token } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [compOffEntries, setCompOffEntries] = useState<CompOffEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', dayPart: 'FULL', reason: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [showAllLeaveTypes, setShowAllLeaveTypes] = useState(false);
  const requestFormRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!prefillLeaveType) return;
    setEditingId(null);
    setForm((f) => ({ ...f, leaveTypeId: prefillLeaveType.id }));
    requestFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillLeaveType]);

  const primaryBalances = useMemo(() => balances.filter((b) => !GENDER_SPECIFIC_CODES.has(b.leaveTypeCode || '')), [balances]);
  const secondaryBalances = useMemo(() => balances.filter((b) => GENDER_SPECIFIC_CODES.has(b.leaveTypeCode || '')), [balances]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');
    setSubmitting(true);
    try {
      if (editingId) {
        await updateLeaveRequest(token, editingId, form);
        setEditingId(null);
      } else {
        const created = await createLeaveRequest(token, { ...form, employeeId });
        if (attachFile) {
          try {
            await uploadLeaveAttachment(token, created.id, attachFile);
          } catch (attachErr: any) {
            setError(`Request submitted, but the attachment failed to upload: ${attachErr.message}`);
          }
        }
      }
      setForm({ leaveTypeId: '', startDate: '', endDate: '', dayPart: 'FULL', reason: '' });
      setAttachFile(null);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleEditClick(r: LeaveRequest) {
    setEditingId(r.id);
    setForm({
      leaveTypeId: r.leaveTypeId,
      startDate: r.startDate.slice(0, 10),
      endDate: r.endDate.slice(0, 10),
      dayPart: r.dayPart,
      reason: r.reason || '',
    });
    setError('');
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm({ leaveTypeId: '', startDate: '', endDate: '', dayPart: 'FULL', reason: '' });
    setError('');
  }

  async function handleCancel(id: string, status: string) {
    if (!token) return;
    const message =
      status === 'APPROVED'
        ? 'This leave is already approved. Cancel it anyway?'
        : 'Cancel this leave request?';
    if (!confirm(message)) return;
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-800">{title}</h2>

      {!hideBalances &&
        (loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {primaryBalances.map((b, i) => (
                <LeaveBalanceCard key={b.leaveTypeId} balance={b} style={cardStyleFor(b.leaveTypeCode, i)} compact />
              ))}
              {showAllLeaveTypes &&
                secondaryBalances.map((b, i) => (
                  <LeaveBalanceCard
                    key={b.leaveTypeId}
                    balance={b}
                    style={cardStyleFor(b.leaveTypeCode, primaryBalances.length + i)}
                    compact
                  />
                ))}
            </div>
            {secondaryBalances.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAllLeaveTypes((v) => !v)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-mitra-accentFrom"
              >
                <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${showAllLeaveTypes ? 'rotate-180' : ''}`} />
                {showAllLeaveTypes
                  ? 'Show fewer leave types'
                  : `Show ${secondaryBalances.length} more leave type${secondaryBalances.length === 1 ? '' : 's'}`}
              </button>
            )}
          </div>
        ))}

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div ref={requestFormRef} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 scroll-mt-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">{editingId ? 'Edit Leave Request' : 'Request Leaves'}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Leave Type</label>
            <select
              required
              value={form.leaveTypeId}
              onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
              className={inputClass}
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
              onChange={(e) => {
                const dayPart = e.target.value;
                setForm((f) => ({ ...f, dayPart, endDate: dayPart !== 'FULL' ? f.startDate : f.endDate }));
              }}
              className={inputClass}
            >
              <option value="FULL">Full day</option>
              <option value="FIRST_HALF">First half</option>
              <option value="SECOND_HALF">Second half</option>
            </select>
            {form.dayPart !== 'FULL' && (
              <p className="text-[11px] text-slate-400 mt-1">Half-day requests are for a single day.</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Start Date</label>
            <input
              type="date"
              required
              value={form.startDate}
              onChange={(e) => {
                const startDate = e.target.value;
                setForm((f) => ({ ...f, startDate, endDate: f.dayPart !== 'FULL' ? startDate : f.endDate }));
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">End Date</label>
            <input
              type="date"
              required
              value={form.endDate}
              onChange={(e) => {
                const endDate = e.target.value;
                setForm((f) => ({ ...f, endDate, dayPart: f.dayPart !== 'FULL' && endDate !== f.startDate ? 'FULL' : f.dayPart }));
              }}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Reason</label>
            <textarea
              rows={3}
              required
              minLength={1}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">
              Supporting document <span className="text-slate-400">(optional — e.g. medical certificate)</span>
            </label>
            <FileDropzone file={attachFile} onChange={setAttachFile} accept="image/*,application/pdf" hint="Image or PDF" />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
            >
              {submitting ? (editingId ? 'Updating...' : 'Submitting...') : editingId ? 'Update Request' : 'Submit Request'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">My Leave Requests</h3>
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 py-10 text-center">
            <CalendarCheckIcon className="w-6 h-6 text-slate-300" />
            <p className="text-slate-400 text-sm">No leave requests yet.</p>
          </div>
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
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="py-2">
                      {r.attachmentUrl ? (
                        <button
                          type="button"
                          onClick={() => token && openAuthedFile(token, `/leave-requests/${r.id}/attachment`)}
                          title="View attachment"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-mitra-accentFrom hover:bg-slate-50"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      ) : r.status === 'CANCELLED' ? (
                        <span className="text-slate-300 text-xs">—</span>
                      ) : (
                        <label
                          title="Attach a document"
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer ${
                            attachingId === r.id ? 'text-slate-300' : 'text-slate-400 hover:text-mitra-accentFrom hover:bg-slate-50'
                          }`}
                        >
                          <PaperclipIcon className="w-4 h-4" />
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
                    <td className="py-2 text-right space-x-3">
                      {r.status === 'PENDING' && (
                        <button onClick={() => handleEditClick(r)} className="text-mitra-accentFrom hover:text-mitra-accentTo text-xs font-medium">
                          Edit
                        </button>
                      )}
                      {(r.status === 'PENDING' || r.status === 'APPROVED') && (
                        <button onClick={() => handleCancel(r.id, r.status)} className="text-red-500 hover:text-red-700 text-xs">
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

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Compensatory Off</h3>
        <p className="text-xs text-slate-500 mb-4">
          Worked an extra weekend or holiday? Log it here — once an admin approves it, the day is added to your
          Compensatory Off balance above and you can request it back as time off.
        </p>
        {compOffMessage && <div className="text-sm text-slate-600 mb-3">{compOffMessage}</div>}
        <form onSubmit={handleCompOffSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5 mb-6">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Date Worked</label>
            <input
              type="date"
              required
              max={new Date().toISOString().slice(0, 10)}
              value={compOffForm.workedDate}
              onChange={(e) => setCompOffForm({ ...compOffForm, workedDate: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Days Earned</label>
            <select
              value={compOffForm.daysEarned}
              onChange={(e) => setCompOffForm({ ...compOffForm, daysEarned: e.target.value })}
              className={inputClass}
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
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={compOffSubmitting}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
            >
              {compOffSubmitting ? 'Logging...' : 'Log Day Worked'}
            </button>
          </div>
        </form>

        {compOffEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 py-10 text-center">
            <ClipboardListIcon className="w-6 h-6 text-slate-300" />
            <p className="text-slate-400 text-sm">No comp-off entries yet.</p>
          </div>
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
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_STYLES[c.status]}`}>{c.status}</span>
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
