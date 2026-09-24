import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { decideLeaveRequest, getAttendanceCalendar, getEmployees, getLeaveCalendar, getLeaveRequests } from '../../lib/api';
import { Employee, LeaveRequest } from '../../types';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfWeek(d: Date) {
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - day);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

// My Team's "Team Attendance & Approvals" sub-view — merges what were two
// separate sub-views (Team Attendance, Team Approvals) into one per the
// latest nav spec's 3-item My Team list. Two headed sections stacked
// vertically: this week's attendance grid, then pending leave approvals
// from direct reports.
//
// Approvals stay Staff-only at the backend (see MyTeamApprovals.tsx's
// original notes): PATCH /leave-requests/:id/decide has a StaffOnlyGuard,
// and GET /leave-requests ignores employeeId/status filters entirely for
// an EMPLOYEE-kind session. The attendance grid has no such restriction —
// it's built from the open GET /leave-requests/calendar and attendance
// calendar endpoints — so that section renders for every manager
// regardless of session kind, while approvals shows the same honest gap
// for a non-staff manager as before.
export default function MyTeamAttendanceApprovals() {
  const { user, token, isStaff } = useAuth();
  const myEmployeeId = user?.employeeId || user?.id;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [presentByDate, setPresentByDate] = useState<Map<string, Set<string>>>(new Map());
  const [leaveRanges, setLeaveRanges] = useState<{ employeeId: string; start: string; end: string }[]>([]);

  const [pending, setPending] = useState<LeaveRequest[]>([]);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    getEmployees(token)
      .then(setEmployees)
      .finally(() => setEmployeesLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const now = new Date();
    const nextMonth = now.getUTCMonth() === 11 ? 1 : now.getUTCMonth() + 2;
    const nextYear = now.getUTCMonth() === 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();

    Promise.all([
      getAttendanceCalendar(token, now.getUTCFullYear(), now.getUTCMonth() + 1),
      now.getUTCMonth() === 11 ? getAttendanceCalendar(token, nextYear, nextMonth) : null,
    ])
      .then(([cur, next]) => {
        const map = new Map<string, Set<string>>();
        [...cur.days, ...(next?.days || [])].forEach((d) => {
          map.set(d.date.slice(0, 10), new Set((d.present || []).map((e) => e.id)));
        });
        setPresentByDate(map);
      })
      .catch(() => {});

    Promise.all([getLeaveCalendar(token, now.getUTCFullYear(), now.getUTCMonth() + 1), getLeaveCalendar(token, nextYear, nextMonth)])
      .then(([cur, next]) =>
        setLeaveRanges(
          [...cur.requests, ...next.requests]
            .filter((r) => r.status === 'APPROVED')
            .map((r) => ({ employeeId: r.employeeId, start: r.startDate.slice(0, 10), end: r.endDate.slice(0, 10) })),
        ),
      )
      .catch(() => {});
  }, [token]);

  const directReports = useMemo(
    () => employees.filter((e) => e.reportingManagerId === myEmployeeId && e.status === 'ACTIVE'),
    [employees, myEmployeeId],
  );

  const directReportIds = useMemo(() => new Set(directReports.map((e) => e.id)), [directReports]);

  useEffect(() => {
    if (!token || !isStaff || directReportIds.size === 0) return;
    getLeaveRequests(token, { status: 'PENDING' })
      .then((all) => setPending(all.filter((r) => directReportIds.has(r.employeeId))))
      .catch((err: Error) => setError(err.message));
  }, [token, isStaff, directReportIds]);

  async function handleDecide(id: string, status: 'APPROVED' | 'REJECTED') {
    if (!token) return;
    setDecidingId(id);
    setError('');
    try {
      await decideLeaveRequest(token, id, status);
      setPending((p) => p.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to update the request');
    } finally {
      setDecidingId(null);
    }
  }

  const week = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      return d;
    });
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);

  function statusFor(employeeId: string, day: Date): { label: string; className: string } {
    const dayStr = day.toISOString().slice(0, 10);
    const onLeave = leaveRanges.some((r) => r.employeeId === employeeId && r.start <= dayStr && r.end >= dayStr);
    if (onLeave) return { label: 'Leave', className: 'bg-amber-100 text-amber-700' };
    const present = presentByDate.get(dayStr)?.has(employeeId);
    if (present) return { label: 'Present', className: 'bg-emerald-100 text-emerald-700' };
    if (dayStr < todayStr) return { label: 'Absent', className: 'bg-red-50 text-red-600' };
    if (dayStr === todayStr) return { label: 'Not yet', className: 'bg-slate-50 text-slate-400' };
    return { label: '—', className: 'bg-slate-50 text-slate-300' };
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Team Attendance & Approvals</h1>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">This Week's Attendance</h3>
        <p className="text-xs text-slate-400 mb-3">
          Checked-in status combined with approved leave. MitraHR doesn't yet track remote/onsite work mode, so that
          distinction isn't shown here.
        </p>
        {employeesLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : directReports.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
            You don't currently have any direct reports in MitraHR.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-5 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="pb-2 pr-3 font-medium">Member</th>
                  {week.map((d, i) => (
                    <th key={i} className="pb-2 px-1.5 font-medium text-center">
                      {WEEKDAY_LABELS[i]}
                      <div className="text-[10px] text-slate-300">{d.getUTCDate()}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {directReports.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">{e.fullName}</td>
                    {week.map((d, i) => {
                      const s = statusFor(e.id, d);
                      return (
                        <td key={i} className="py-2 px-1.5 text-center">
                          <span className={`inline-block w-full rounded px-1 py-0.5 text-[10px] font-medium ${s.className}`}>
                            {s.label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Pending Approvals</h3>
        {!isStaff ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
            Viewing and deciding your team's pending leave requests requires an Admin/HR account. Ask HR to action any
            pending requests from your reports in the meantime.
          </div>
        ) : (
          <>
            {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
            {employeesLoading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : pending.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
                Nothing pending from your team right now.
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((lr) => (
                  <div
                    key={lr.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{lr.employee?.fullName || 'Employee'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {lr.leaveType.name} · {new Date(lr.startDate).toLocaleDateString()} –{' '}
                        {new Date(lr.endDate).toLocaleDateString()} · {lr.totalDays} day{lr.totalDays === 1 ? '' : 's'}
                      </p>
                      {lr.reason && <p className="text-xs text-slate-400 mt-1">"{lr.reason}"</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDecide(lr.id, 'REJECTED')}
                        disabled={decidingId === lr.id}
                        className="text-xs font-medium text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecide(lr.id, 'APPROVED')}
                        disabled={decidingId === lr.id}
                        className="text-xs font-medium text-white bg-mitra-accentFrom rounded-lg px-3 py-1.5 disabled:opacity-50"
                      >
                        {decidingId === lr.id ? 'Saving…' : 'Approve'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
