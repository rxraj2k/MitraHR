import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import AttendanceCheckIn from '../../components/AttendanceCheckIn';
import MyLeavePanel from '../../components/MyLeavePanel';
import MonthCalendar from '../../components/MonthCalendar';
import SearchableSelect from '../../components/SearchableSelect';
import TabBar, { TabBarItem } from '../../components/TabBar';
import {
  createLeaveRequest,
  decideCompOffEntry,
  decideLeaveRequest,
  getAttendanceCalendar,
  getCompOffEntries,
  getEmployees,
  getLeaveRequests,
  getLeaveTypes,
  openAuthedFile,
} from '../../lib/api';
import { AttendanceDay, CompOffEntry, Employee, LeaveRequest, LeaveType } from '../../types';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

type LeaveSection = 'overview' | 'calendar';
const LEAVE_TABS: TabBarItem<LeaveSection>[] = [
  { key: 'overview', label: 'Leaves & Attendance', color: 'indigo' },
  { key: 'calendar', label: 'Leave & Attendance Calendar', color: 'sky' },
];

function dateRange(start: string, end: string) {
  const s = start.slice(0, 10);
  const e = end.slice(0, 10);
  return s === e ? s : `${s} → ${e}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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
  const [section, setSection] = useState<LeaveSection>('overview');

  const [compOffEntries, setCompOffEntries] = useState<CompOffEntry[]>([]);
  const [compOffNotes, setCompOffNotes] = useState<Record<string, string>>({});
  const [compOffTab, setCompOffTab] = useState<'pending' | 'all'>('pending');

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
  const [todayDay, setTodayDay] = useState<AttendanceDay | null>(null);

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([getLeaveRequests(token), getEmployees(token), getLeaveTypes(token), getCompOffEntries(token)])
      .then(([r, e, t, c]) => {
        setRequests(r);
        setEmployees(e);
        setLeaveTypes(t.filter((lt) => lt.active));
        setCompOffEntries(c);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  function loadCalendar() {
    if (!token) return;
    getAttendanceCalendar(token, calYear, calMonth)
      .then((res) => setCalendarDays(res.days))
      .catch(() => {});
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadCalendar, [token, calYear, calMonth]);

  // A "today at a glance" snapshot, fetched independently of whichever month
  // the browsable calendar below is currently showing, so it stays accurate
  // even while an admin is looking back at a previous month.
  function loadToday() {
    if (!token) return;
    const n = new Date();
    getAttendanceCalendar(token, n.getUTCFullYear(), n.getUTCMonth() + 1)
      .then((res) => setTodayDay(res.days.find((d) => d.date === todayIso()) || null))
      .catch(() => {});
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadToday, [token]);

  // Keep every section fresh without a manual reload: a request submitted
  // or decided in another open session (employee vs. admin tab) shows up
  // here on the next tick or when this tab regains focus.
  useAutoRefresh(() => {
    load();
    loadCalendar();
    loadToday();
  });

  async function handleDecide(id: string, status: 'APPROVED' | 'REJECTED') {
    if (!token) return;
    setError('');
    try {
      await decideLeaveRequest(token, id, status, notes[id]);
      load();
      loadCalendar();
      loadToday();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDecideCompOff(id: string, status: 'APPROVED' | 'REJECTED') {
    if (!token) return;
    setError('');
    try {
      await decideCompOffEntry(token, id, status, compOffNotes[id]);
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
      loadCalendar();
      loadToday();
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

  const compOffPending = compOffEntries.filter((c) => c.status === 'PENDING');
  const compOffShown = compOffTab === 'pending' ? compOffPending : compOffEntries;

  const iso = todayIso();
  const in7Days = new Date();
  in7Days.setUTCDate(in7Days.getUTCDate() + 7);
  const upcomingLeaves = requests
    .filter((r) => r.status === 'APPROVED' && r.startDate.slice(0, 10) >= iso && r.startDate.slice(0, 10) <= in7Days.toISOString().slice(0, 10))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const todayPresentCount =
    (todayDay?.present.length || 0) + (todayDay?.presentOnHoliday.length || 0) + (todayDay?.presentOnWeekend.length || 0);

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

      <TabBar tabs={LEAVE_TABS} active={section} onChange={setSection} />

      {section === 'overview' && (
        <>
      {user?.employeeId && (
        <div className="space-y-6">
          <AttendanceCheckIn />
          <MyLeavePanel employeeId={user.employeeId} title="My Leaves" />
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Today at a Glance</h2>
        {todayDay?.holiday && (
          <div className="mb-4 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm px-4 py-2">
            Today is a holiday: {todayDay.holiday.name} ({todayDay.holiday.region})
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs font-medium text-green-600">Present Today</p>
            <p className="text-2xl font-semibold text-green-900 mt-1">{todayPresentCount}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-medium text-amber-600">On Leave Today</p>
            <p className="text-2xl font-semibold text-amber-900 mt-1">{todayDay?.onLeave.length || 0}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-medium text-blue-600">Upcoming Leaves (7 days)</p>
            <p className="text-2xl font-semibold text-blue-900 mt-1">{upcomingLeaves.length}</p>
          </div>
        </div>
        {(todayDay?.onLeave.length || upcomingLeaves.length) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!!todayDay?.onLeave.length && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Out Today</h3>
                <ul className="space-y-1 text-sm">
                  {todayDay.onLeave.map((entry, i) => (
                    <li key={i} className="text-slate-700">
                      {entry.fullName} <span className="text-slate-400">— {entry.leaveTypeName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!!upcomingLeaves.length && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Coming Up (next 7 days)</h3>
                <ul className="space-y-1 text-sm">
                  {upcomingLeaves.map((r) => (
                    <li key={r.id} className="text-slate-700">
                      {r.employee?.fullName || '—'} <span className="text-slate-400">— {r.leaveType.name}, {dateRange(r.startDate, r.endDate)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Nobody is on leave today, and no approved leaves in the next 7 days.</p>
        )}
      </div>

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
            <label className="block text-xs text-slate-500 mb-1">Reason</label>
            <input
              required
              minLength={1}
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
                  <th className="pb-2 font-medium">Document</th>
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
                      {r.attachmentUrl ? (
                        <button
                          type="button"
                          onClick={() => token && openAuthedFile(token, `/leave-requests/${r.id}/attachment`)}
                          className="text-mitra-accentFrom hover:underline text-xs"
                        >
                          View
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
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
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-slate-800">Compensatory Off Requests</h2>
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => setCompOffTab('pending')}
              className={`px-3 py-1 rounded-lg ${compOffTab === 'pending' ? 'bg-mitra-navy text-white' : 'text-slate-500'}`}
            >
              Pending ({compOffPending.length})
            </button>
            <button
              onClick={() => setCompOffTab('all')}
              className={`px-3 py-1 rounded-lg ${compOffTab === 'all' ? 'bg-mitra-navy text-white' : 'text-slate-500'}`}
            >
              All
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Extra days employees logged as worked. Approving one credits their Compensatory Off balance.
        </p>
        {compOffShown.length === 0 ? (
          <p className="text-slate-500 text-sm">Nothing here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Employee</th>
                  <th className="pb-2 font-medium">Date Worked</th>
                  <th className="pb-2 font-medium">Days</th>
                  <th className="pb-2 font-medium">Reason</th>
                  <th className="pb-2 font-medium">Status</th>
                  {compOffTab === 'pending' && <th className="pb-2 font-medium">Decide</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {compOffShown.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2">{c.employee?.fullName || '—'}</td>
                    <td className="py-2 text-slate-600">{c.workedDate.slice(0, 10)}</td>
                    <td className="py-2">{c.daysEarned}</td>
                    <td className="py-2 text-slate-500 max-w-[200px] truncate" title={c.reason}>
                      {c.reason}
                    </td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                    </td>
                    {compOffTab === 'pending' && (
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <input
                            placeholder="note (optional)"
                            value={compOffNotes[c.id] || ''}
                            onChange={(e) => setCompOffNotes({ ...compOffNotes, [c.id]: e.target.value })}
                            className="w-28 rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                          <button
                            onClick={() => handleDecideCompOff(c.id, 'APPROVED')}
                            className="text-green-600 hover:text-green-800 text-xs font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleDecideCompOff(c.id, 'REJECTED')}
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

        </>
      )}

      {section === 'calendar' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <MonthCalendar year={calYear} month={calMonth} days={calendarDays} onPrev={prevMonth} onNext={nextMonth} />
        </div>
      )}
    </div>
  );
}
