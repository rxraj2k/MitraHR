import { AwardIcon, CalendarCheckIcon, ClockIcon, GraduationCapIcon } from '../icons';
import { LightCardTheme } from '../../lib/lightPalette';
import { AttendanceToday, EmployeeTraining, LeaveBalance, QuizResultRow } from '../../types';

// Small "here's something else real about you" cards -- used only as grid
// fillers when a row of same-type items (projects/assets/documents) doesn't
// fill out a full line, so the row doesn't end in dead white space. Each
// one surfaces genuine self-service data this app already tracks elsewhere
// (My Leave & Attendance, Learning Center) rather than leaving a blank
// tile or inventing a number to fill the space.
function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function FillerShell({
  theme,
  icon: Icon,
  title,
  children,
}: {
  theme: LightCardTheme;
  icon: (props: { className?: string }) => JSX.Element;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`hidden lg:flex flex-col rounded-xl border ${theme.border} ${theme.bg} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-white/70 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 flex-shrink-0">
          <Icon className="w-3.5 h-3.5" />
        </span>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</p>
      </div>
      {children}
    </div>
  );
}

export function LeaveBalanceFillerCard({ balances, theme }: { balances: LeaveBalance[]; theme: LightCardTheme }) {
  const withBalance = balances.filter((b) => b.remaining != null);
  const total = withBalance.reduce((sum, b) => sum + (b.remaining || 0), 0);
  const top = [...withBalance].sort((a, b) => (b.remaining || 0) - (a.remaining || 0)).slice(0, 2);

  return (
    <FillerShell theme={theme} icon={CalendarCheckIcon} title="Leave Balance">
      <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">{Math.round(total * 10) / 10} days</p>
      {top.length > 0 ? (
        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
          {top.map((b) => (
            <div key={b.leaveTypeId} className="flex items-center justify-between">
              <span className="truncate">{b.leaveTypeName}</span>
              <span className="font-medium text-slate-600 dark:text-slate-300 flex-shrink-0">{b.remaining}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">No balance on file yet.</p>
      )}
    </FillerShell>
  );
}

export function TrainingProgressFillerCard({ training, theme }: { training: EmployeeTraining[]; theme: LightCardTheme }) {
  const total = training.length;
  const completed = training.filter((t) => t.status === 'COMPLETED').length;
  const inProgress = training.filter((t) => t.status === 'IN_PROGRESS').length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <FillerShell theme={theme} icon={GraduationCapIcon} title="Learning Progress">
      {total === 0 ? (
        <p className="text-xs text-slate-400">No courses assigned yet.</p>
      ) : (
        <>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
            {completed}/{total} <span className="text-xs font-medium text-slate-400">completed</span>
          </p>
          <div className="h-1.5 rounded-full bg-white/70 dark:bg-slate-900/40 overflow-hidden mb-1.5">
            <div className="h-full rounded-full bg-teal-500/70" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] text-slate-400">{inProgress} in progress</p>
        </>
      )}
    </FillerShell>
  );
}

export function TodayAttendanceFillerCard({ today, theme }: { today: AttendanceToday | null; theme: LightCardTheme }) {
  return (
    <FillerShell theme={theme} icon={ClockIcon} title="Today's Attendance">
      {!today || !today.checkedIn ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Not checked in yet today.</p>
      ) : (
        <>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Checked in <span className="font-semibold">{today.markedAt ? shortTime(today.markedAt) : '—'}</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {today.checkedOut ? (
              <>Checked out {today.checkOutAt ? shortTime(today.checkOutAt) : ''}</>
            ) : (
              'Still checked in'
            )}
          </p>
        </>
      )}
    </FillerShell>
  );
}

export function AssessmentsFillerCard({ results, theme }: { results: QuizResultRow[]; theme: LightCardTheme }) {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const latest = [...results].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];

  return (
    <FillerShell theme={theme} icon={AwardIcon} title="My Assessments">
      {total === 0 ? (
        <p className="text-xs text-slate-400">No assessments taken yet.</p>
      ) : (
        <>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
            {passed}/{total} <span className="text-xs font-medium text-slate-400">passed</span>
          </p>
          {latest && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Latest: {latest.subjectTitle} — {latest.percent}%
            </p>
          )}
        </>
      )}
    </FillerShell>
  );
}

// How many extra cards a row needs to reach a full line of `columns` items
// (3, matching these sections' lg:grid-cols-3) -- 0 when there are no real
// items yet (the section shows its own empty-state message instead) or the
// row already lands on an exact multiple.
export function fillerCountFor(itemCount: number, columns = 3): number {
  if (itemCount === 0) return 0;
  const remainder = itemCount % columns;
  return remainder === 0 ? 0 : columns - remainder;
}
