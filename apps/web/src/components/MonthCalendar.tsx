import { useMemo, useState } from 'react';
import { AttendanceDay } from '../types';

interface Props {
  year: number;
  month: number;
  days: AttendanceDay[];
  onPrev: () => void;
  onNext: () => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAY_PART_LABELS: Record<string, string> = {
  FULL: 'Full day',
  FIRST_HALF: 'First half',
  SECOND_HALF: 'Second half',
};

function monthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function hasAnyData(day: AttendanceDay) {
  return (
    day.present.length > 0 ||
    day.onLeave.length > 0 ||
    day.absent.length > 0 ||
    day.presentOnHoliday.length > 0 ||
    day.presentOnWeekend.length > 0
  );
}

// Full 7-column month grid — one cell per day. Holidays/weekends are
// greyed out by default, but still clickable when someone checked in
// anyway (shown as "Present on Holiday" / "Present on Week-Off") or has
// approved leave spanning that day.
export default function MonthCalendar({ year, month, days, onPrev, onNext }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const todayIso = new Date().toISOString().slice(0, 10);

  const cells = useMemo(() => {
    const arr: (AttendanceDay | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) arr.push(null);
    arr.push(...days);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [days, firstWeekday]);

  const selectedDay = days.find((d) => d.date === selected) || null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Leave and Attendance Calendar</h2>
        <div className="flex items-center gap-3 text-sm">
          <button onClick={onPrev} className="text-slate-500 hover:text-slate-800">
            ←
          </button>
          <span className="font-medium text-slate-700">{monthLabel(year, month)}</span>
          <button onClick={onNext} className="text-slate-500 hover:text-slate-800">
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-xs text-slate-400 mb-1">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="text-center font-medium">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="rounded-lg min-h-[84px] bg-transparent" />;
          const nonWorking = day.isWeekend || !!day.holiday;
          const clickable = hasAnyData(day);
          const isToday = day.date === todayIso;
          const isSelected = day.date === selected;
          return (
            <button
              key={day.date}
              onClick={() => clickable && setSelected(isSelected ? null : day.date)}
              disabled={!clickable}
              className={[
                'rounded-lg min-h-[84px] p-1.5 text-left border transition-colors',
                nonWorking ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200',
                clickable ? 'hover:border-mitra-accentFrom cursor-pointer' : 'cursor-default',
                isSelected ? 'ring-2 ring-mitra-accentFrom' : '',
                isToday ? 'border-mitra-navy' : '',
              ].join(' ')}
            >
              <div className={`text-xs font-medium ${nonWorking ? 'text-slate-400' : 'text-slate-700'}`}>
                {parseInt(day.date.slice(8, 10), 10)}
              </div>
              {day.holiday && (
                <div className="text-[10px] text-indigo-500 mt-1 leading-tight line-clamp-2">{day.holiday.name}</div>
              )}
              {!day.holiday && day.isWeekend && <div className="text-[10px] text-slate-300 mt-1">Weekend</div>}
              <div className="mt-1 space-y-0.5">
                {day.present.length > 0 && (
                  <div className="text-[10px] text-green-600">● {day.present.length} present</div>
                )}
                {day.presentOnHoliday.length > 0 && (
                  <div className="text-[10px] text-emerald-600">● {day.presentOnHoliday.length} present (holiday)</div>
                )}
                {day.presentOnWeekend.length > 0 && (
                  <div className="text-[10px] text-emerald-600">● {day.presentOnWeekend.length} present (week-off)</div>
                )}
                {day.onLeave.length > 0 && <div className="text-[10px] text-amber-600">● {day.onLeave.length} leave</div>}
                {day.absent.length > 0 && <div className="text-[10px] text-red-500">● {day.absent.length} absent</div>}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-700 mb-3">
            {new Date(selectedDay.date + 'T00:00:00Z').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              timeZone: 'UTC',
            })}
            {selectedDay.holiday && <span className="text-indigo-500 font-normal"> — {selectedDay.holiday.name}</span>}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-amber-600 mb-1">On Leave ({selectedDay.onLeave.length})</p>
              {selectedDay.onLeave.length === 0 ? (
                <p className="text-slate-400 text-xs">None</p>
              ) : (
                <ul className="text-slate-600 space-y-1.5">
                  {selectedDay.onLeave.map((e) => (
                    <li key={e.id}>
                      <span className="font-medium text-slate-700">{e.fullName}</span> — {e.leaveTypeName}
                      {e.dayPart !== 'FULL' && ` (${DAY_PART_LABELS[e.dayPart] || e.dayPart})`}
                      {e.reason && <div className="text-xs text-slate-400">Reason: {e.reason}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-green-600 mb-1">
                Present ({selectedDay.present.length + selectedDay.presentOnHoliday.length + selectedDay.presentOnWeekend.length})
              </p>
              {selectedDay.present.length === 0 &&
              selectedDay.presentOnHoliday.length === 0 &&
              selectedDay.presentOnWeekend.length === 0 ? (
                <p className="text-slate-400 text-xs">None</p>
              ) : (
                <ul className="text-slate-600 space-y-0.5">
                  {selectedDay.present.map((e) => (
                    <li key={e.id}>{e.fullName}</li>
                  ))}
                  {selectedDay.presentOnHoliday.map((e) => (
                    <li key={e.id}>
                      {e.fullName} <span className="text-xs text-emerald-500">(present on holiday)</span>
                    </li>
                  ))}
                  {selectedDay.presentOnWeekend.map((e) => (
                    <li key={e.id}>
                      {e.fullName} <span className="text-xs text-emerald-500">(present on week-off)</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {selectedDay.absent.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-500 mb-1">Absent ({selectedDay.absent.length})</p>
                <ul className="text-slate-600 space-y-0.5">
                  {selectedDay.absent.map((e) => (
                    <li key={e.id}>{e.fullName}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
