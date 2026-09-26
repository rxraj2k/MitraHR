import { useEffect, useMemo, useState } from 'react';
import { getUpcomingBirthdays } from '../../lib/api';
import { Employee, UpcomingBirthday } from '../../types';
import { Avatar } from '../Avatar';
import { CakeIcon, TrophyIcon, UserPlusIcon } from '../icons';

interface Props {
  token: string;
  employees: Employee[];
}

function yearsBetween(from: Date, to: Date): number {
  let years = to.getFullYear() - from.getFullYear();
  const anniversaryPassed = to.getMonth() > from.getMonth() || (to.getMonth() === from.getMonth() && to.getDate() >= from.getDate());
  if (!anniversaryPassed) years -= 1;
  return years;
}

// Auto-generated, not composed -- upcoming birthdays reuse the same
// endpoint as Organization > Birthdays; work anniversaries and new joiners
// are computed here from the already-loaded employee directory (same
// dateOfJoining field Organization > New Hires reads), so this card adds
// no new backend surface, just a compact "what's coming up" summary.
export default function OfficeWallMilestones({ token, employees }: Props) {
  const [birthdays, setBirthdays] = useState<UpcomingBirthday[] | null>(null);

  useEffect(() => {
    if (!token) return;
    getUpcomingBirthdays(token, 14)
      .then(setBirthdays)
      .catch(() => setBirthdays([]));
  }, [token]);

  const anniversaries = useMemo(() => {
    const now = new Date();
    const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    return employees
      .filter((e) => e.status === 'ACTIVE' && e.dateOfJoining)
      .map((e) => {
        const joined = new Date(e.dateOfJoining as string);
        const thisYear = new Date(now.getFullYear(), joined.getMonth(), joined.getDate());
        const next = thisYear >= now ? thisYear : new Date(now.getFullYear() + 1, joined.getMonth(), joined.getDate());
        return { employee: e, next, years: yearsBetween(joined, next) };
      })
      .filter((row) => row.years >= 1 && row.next <= in14)
      .sort((a, b) => a.next.getTime() - b.next.getTime())
      .slice(0, 5);
  }, [employees]);

  const newJoiners = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return employees
      .filter((e) => e.status === 'ACTIVE' && e.dateOfJoining && new Date(e.dateOfJoining).getTime() >= cutoff)
      .sort((a, b) => new Date(b.dateOfJoining as string).getTime() - new Date(a.dateOfJoining as string).getTime())
      .slice(0, 5);
  }, [employees]);

  const hasAny = (birthdays && birthdays.length > 0) || anniversaries.length > 0 || newJoiners.length > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 dark:bg-slate-900 dark:border-slate-800">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Company Milestones</h3>
      {!hasAny ? (
        <p className="text-xs text-slate-400">Nothing coming up in the next two weeks.</p>
      ) : (
        <div className="space-y-4">
          {!!birthdays?.length && (
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <CakeIcon className="w-3.5 h-3.5" /> Birthdays
              </p>
              <ul className="space-y-1.5">
                {birthdays.slice(0, 5).map((b) => (
                  <li key={b.id} className="flex items-center gap-2 text-xs">
                    <Avatar name={b.fullName} photoUrl={b.photoUrl} size="sm" />
                    <span className="text-slate-600 dark:text-slate-300 truncate">{b.fullName}</span>
                    <span className="text-slate-400 ml-auto flex-shrink-0">{b.daysUntil === 0 ? 'Today' : `${b.daysUntil}d`}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!anniversaries.length && (
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <TrophyIcon className="w-3.5 h-3.5" /> Work Anniversaries
              </p>
              <ul className="space-y-1.5">
                {anniversaries.map(({ employee, years }) => (
                  <li key={employee.id} className="flex items-center gap-2 text-xs">
                    <Avatar name={employee.fullName} photoUrl={employee.photoUrl} size="sm" />
                    <span className="text-slate-600 dark:text-slate-300 truncate">{employee.fullName}</span>
                    <span className="text-slate-400 ml-auto flex-shrink-0">{years}yr</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!newJoiners.length && (
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <UserPlusIcon className="w-3.5 h-3.5" /> New Joiners
              </p>
              <ul className="space-y-1.5">
                {newJoiners.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-xs">
                    <Avatar name={e.fullName} photoUrl={e.photoUrl} size="sm" />
                    <span className="text-slate-600 dark:text-slate-300 truncate">{e.fullName}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
