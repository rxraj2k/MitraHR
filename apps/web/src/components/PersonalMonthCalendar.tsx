import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { getAttendanceCalendar } from '../lib/api';
import { AttendanceDay } from '../types';

interface Props {
  employeeId: string;
}

type Status = 'PRESENT' | 'PRESENT_HOLIDAY' | 'PRESENT_WEEKEND' | 'LEAVE' | 'ABSENT' | 'HOLIDAY' | 'WEEKEND' | 'PENDING';

const STATUS_STYLE: Record<Status, string> = {
  PRESENT: 'bg-green-50 border-green-200 text-green-700',
  PRESENT_HOLIDAY: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  PRESENT_WEEKEND: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  LEAVE: 'bg-amber-50 border-amber-200 text-amber-700',
  ABSENT: 'bg-red-50 border-red-200 text-red-600',
  HOLIDAY: 'bg-indigo-50 border-indigo-100 text-indigo-500',
  WEEKEND: 'bg-slate-50 border-slate-100 text-slate-400',
  PENDING: 'bg-white border-slate-200 text-slate-700',
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function monthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function deriveStatus(day: AttendanceDay): { status: Status; note?: string } {
  if (day.onLeave.length > 0) return { status: 'LEAVE', note: day.onLeave[0].leaveTypeName };
  if (day.presentOnHoliday.length > 0) return { status: 'PRESENT_HOLIDAY', note: day.holiday?.name };
  if (day.presentOnWeekend.length > 0) return { status: 'PRESENT_WEEKEND' };
  if (day.present.length > 0) return { status: 'PRESENT' };
  if (day.absent.length > 0) return { status: 'ABSENT' };
  if (day.holiday) return { status: 'HOLIDAY', note: day.holiday.name };
  if (day.isWeekend) return { status: 'WEEKEND' };
  return { status: 'PENDING' };
}

const STATUS_CELL_LABEL: Record<Status, string> = {
  PRESENT: 'Present',
  PRESENT_HOLIDAY: 'Present on Holiday',
  PRESENT_WEEKEND: 'Present on Week-Off',
  LEAVE: 'On Leave',
  ABSENT: 'Absent',
  HOLIDAY: 'Holiday',
  WEEKEND: 'Week-Off',
  PENDING: '',
};

// A single employee's own month view — one status per day, plus a summary
// strip totalling present/leave/absent/holiday days for the shown month.
export default function PersonalMonthCalendar({ employeeId }: Props) {
  const { token } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [days, setDays] = useState<AttendanceDay[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    if (!token || !employeeId) return;
    getAttendanceCalendar(token, year, month, employeeId)
      .then((res) => setDays(res.days))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, employeeId, year, month]);
  useAutoRefresh(load);

  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells = useMemo(() => {
    const arr: (AttendanceDay | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) arr.push(null);
    arr.push(...days);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [days, firstWeekday]);

  const totals = useMemo(() => {
    let present = 0;
    let leave = 0;
    let absent = 0;
    let holidays = 0;
    for (const d of days) {
      const { status } = deriveStatus(d);
      if (status === 'PRESENT' || status === 'PRESENT_HOLIDAY' || status === 'PRESENT_WEEKEND') present++;
      else if (status === 'LEAVE') leave++;
      else if (status === 'ABSENT') absent++;
      if (d.holiday) holidays++;
    }
    return { present, leave, absent, holidays };
  }, [days]);

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }
  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">My Attendance Calendar</h2>
        <div className="flex items-center gap-3 text-sm">
          <button onClick={prevMonth} className="text-slate-500 hover:text-slate-800">
            ←
          </button>
          <span className="font-medium text-slate-700">{monthLabel(year, month)}</span>
          <button onClick={nextMonth} className="text-slate-500 hover:text-slate-800">
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg bg-green-50 border border-green-200 p-3">
          <p className="text-xs text-green-600 font-medium">Present</p>
          <p className="text-xl font-semibold text-green-800">{totals.present}</p>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs text-amber-600 font-medium">On Leave</p>
          <p className="text-xl font-semibold text-amber-800">{totals.leave}</p>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-xs text-red-500 font-medium">Absent</p>
          <p className="text-xl font-semibold text-red-700">{totals.absent}</p>
        </div>
        <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3">
          <p className="text-xs text-indigo-500 font-medium">Holidays</p>
          <p className="text-xl font-semibold text-indigo-800">{totals.holidays}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1.5 text-xs text-slate-400 mb-1">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} className="text-center font-medium">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="rounded-lg min-h-[64px] bg-transparent" />;
              const { status, note } = deriveStatus(day);
              return (
                <div key={day.date} className={`rounded-lg min-h-[64px] p-1.5 border ${STATUS_STYLE[status]}`}>
                  <div className="text-xs font-medium">{parseInt(day.date.slice(8, 10), 10)}</div>
                  {STATUS_CELL_LABEL[status] && (
                    <div className="text-[10px] mt-1 leading-tight">{STATUS_CELL_LABEL[status]}</div>
                  )}
                  {note && <div className="text-[9px] leading-tight opacity-80">{note}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
