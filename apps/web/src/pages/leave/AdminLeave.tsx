import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AttendanceCheckIn from '../../components/AttendanceCheckIn';
import MyLeavePanel from '../../components/MyLeavePanel';
import MonthCalendar from '../../components/MonthCalendar';
import SearchableSelect from '../../components/SearchableSelect';
import {
  createLeaveRequest,
  decideLeaveRequest,
  getAttendanceCalendar,
  getEmployees,
  getLeaveRequests,
  getLeaveTypes,
} from '../../lib/api';
import { AttendanceDay, Employee, LeaveRequest, LeaveType } from '../../types';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

function dateRange(start: string, end: string) {
  const s = start.slice(0, 10);
  const e = end.slice(0, 10);
  return s === e ? s : `${s} → ${e}`;
}

export default function AdminLeave() {
  const { token, user } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'pending' | 'all'>('pending');

  const [onBehalf, setOnBehalf] = useState({
    employeeId: '',
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    dayPart: 'FULL',
    reason: '',
  });
  const [onBehalfSubmitting, setOnBehalfSubmitting] = useState(false);
  const [onBehalfMessage, setOnBehalfMessage] = useState('');

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getUTCFullYear());
  const [calMonth, setCalMonth] = useState(now.getUTCMonth() + 1);
  const [calendarDays, setCalendarDays] = useState<AttendanceDay[]>([]);

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([getLeaveRequests(token), getEmployees(token), getLeaveTypes(token)])
      .then(([r, e, t]) => {
        setRequests(r);
        setEmployees(e);
        setLeaveTypes(t.filter((lt) => lt.active));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  useEffect(() => {
    if (!token) return;
    getAttendanceCalendar(token, calYear, calMonth)
      .then((res) => setCalendarDays(res.days))
      .catch(() => {});
  }, [token, calYear, calMonth]);

  async function handleDecide(id: string, status: 'APPROVED' | 'REJECTED') {
    if (!token) return;
    setError('');
    try {
      await decideLeaveRequest(token, id, status, notes[id]);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleOnBehalfSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setOnBehalfMessage('');
    setOnBehalfSubmitting(true);
    try {
      await createLeaveRequest(token, onBehalf);
      setOnBehalf({ employeeId: '', leaveTypeId: '', startDate: '', endDate: '', dayPart: 'FULL', reason: '' });
      setOnBehalfMessage('Leave request submitted.');
      load();
    } catch (err: any) {
      setOnBehalfMessage(err.message);
    } finally {
      setOnBehalfSubmitting(false);
    }
  }

  const pending = requests.filter((r) => r.status === 'PENDING');
  const shown = tab === 'pending' ? pending : requests;
  const employeeOptions = employees.map((e) => ({ id: e.id, name: e.fullName }));
  const sameDay = !!onBehalf.startDate && onBehalf.startDate === onBehalf.endDate;

  function prevMonth() {
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  }
  function nextMonth() {
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  }

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold text-slate-800">Leaves & Attendance</h1>

      {user?.employeeId && (
        <div className="space-y-6">
          <AttendanceCheckIn />
          <MyLeavePanel employeeId={user.employeeId} title="My Leave" />
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Log Leave for an Employee</h2>
        {onBehalfMessage && <div className="text-sm text-slate-600 mb-3">{onBehalfMessage}</div>}
        <form onSubmit={handleOnBehalfSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Employee</label>
            <SearchableSelect
              options={employeeOptions}
              value={onBehalf.employeeId}
              onChange={(id) => setOnBehalf({ ...onBehalf, employeeId: id })}
              placeholder="Search employee..."
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Leave Type</label>
            <select
              required
              value={onBehalf.leaveTypeId}
              onChange={(e) => setOnBehalf({ ...onBehalf, leaveTypeId: e.target.value })}
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
              value={onBehalf.dayPart}
              onChange={(e) => setOnBehalf({ ...onBehalf, dayPart: e.target.value })}
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
              value={onBehalf.startDate}
              onChange={(e) => setOnBehalf({ ...onBehalf, startDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">End Date</label>
            <input
              type="date"
              required
              value={onBehalf.endDate}
              onChange={(e) => setOnBehalf({ ...onBehalf, endDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Reason (optional)</label>
            <input
              value={onBehalf.reason}
              onChange={(e) => setOnBehalf({ ...onBehalf, reason: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={onBehalfSubmitting || !onBehalf.employeeId}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {onBehalfSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Requests</h2>
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => setTab('pending')}
              className={`px-3 py-1 rounded-lg ${tab === 'pending' ? 'bg-mitra-navy text-white' : 'text-slate-500'}`}
            >
              Pending ({pending.length})
            </button>
            <button
              onClick={() => setTab('all')}
              className={`px-3 py-1 rounded-lg ${tab === 'all' ? 'bg-mitra-navy text-white' : 'text-slate-500'}`}
            >
              All
            </button>
          </div>
        </div>
        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : shown.length === 0 ? (
          <p className="text-slate-500 text-sm">Nothing here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Employee</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Dates</th>
                  <th className="pb-2 font-medium">Days</th>
                  <th className="pb-2 font-medium">Reason</th>
                  <th className="pb-2 font-medium">Status</th>
                  {tab === 'pending' && <th className="pb-2 font-medium">Decide</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2">{r.employee?.fullName || '—'}</td>
                    <td className="py-2">{r.leaveType.name}</td>
                    <td className="py-2 text-slate-600">{dateRange(r.startDate, r.endDate)}</td>
                    <td className="py-2">{r.totalDays}</td>
                    <td className="py-2 text-slate-500 max-w-[160px] truncate" title={r.reason || ''}>
                      {r.reason || '—'}
                    </td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                    </td>
                    {tab === 'pending' && (
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <input
                            placeholder="note (optional)"
                            value={notes[r.id] || ''}
                            onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                            className="w-28 rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                          <button
                            onClick={() => handleDecide(r.id, 'APPROVED')}
                            className="text-green-600 hover:text-green-800 text-xs font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleDecide(r.id, 'REJECTED')}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <MonthCalendar year={calYear} month={calMonth} days={calendarDays} onPrev={prevMonth} onNext={nextMonth} />
      </div>

    </div>
  );
}
