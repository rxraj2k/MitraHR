import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAttendanceCalendar, getEmployees, getLeaveCalendar } from '../../lib/api';
import { Employee } from '../../types';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfWeek(d: Date) {
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - day);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

// My Team's "Team Attendance" sub-view — a this-week grid of who's
// checked in, on leave, or (for days already past with no check-in) absent.
// Combines the existing attendance-calendar check-in data with approved
// leave requests — MitraHR doesn't track a remote/onsite work mode
// anywhere, so that distinction isn't part of this grid.
export default function MyTeamAttendance() {
  const { user, token } = useAuth();
  const myEmployeeId = user?.employeeId || user?.id;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [presentByDate, setPresentByDate] = useState<Map<string, Set<string>>>(new Map());
  const [leaveRanges, setLeaveRanges] = useState<{ employeeId: string; start: string; end: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getEmployees(token)
      .then(setEmployees)
      .finally(() => setLoading(false));
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Team Attendance</h1>
        <p className="text-sm text-slate-500 mt-1">
          This week, per direct report — checked-in status combined with approved leave. MitraHR doesn't yet track
          remote/onsite work mode, so that distinction isn't shown here.
        </p>
      </div>

      {loading ? (
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
                        <span className={`inline-block w-full rounded px-1 py-0.5 text-[10px] font-medium ${s.className}`}>{s.label}</span>
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
  );
}
