import { ReactNode } from 'react';
import MiniSparkline from './MiniSparkline';

// Compact KPI tile for the Home dashboard's summary bar. Each metric type
// gets its own soft pastel surface + solid icon badge (mapped 1:1 to
// Tailwind's own 50/500 steps, which happen to match the hex pairs design
// asked for exactly) instead of one flat white card repeated six times.
// `sub` carries real supporting context (a fraction, a count) rather than a
// fabricated "+N% vs last month" -- the schema has no historical snapshot
// of most of these numbers, so no trend badge invents one; `trend`, when
// passed, is a genuine recent-history series (see below), never backfilled.
export type KpiAccent = 'violet' | 'amber' | 'blue' | 'purple' | 'emerald' | 'red';

const ACCENTS: Record<KpiAccent, { cardBg: string; iconBg: string; sparkColor: string }> = {
  violet: { cardBg: 'bg-violet-50 dark:bg-violet-950/30', iconBg: 'bg-violet-500', sparkColor: '#8b5cf6' },
  amber: { cardBg: 'bg-amber-50 dark:bg-amber-950/30', iconBg: 'bg-amber-500', sparkColor: '#f59e0b' },
  blue: { cardBg: 'bg-blue-50 dark:bg-blue-950/30', iconBg: 'bg-blue-500', sparkColor: '#3b82f6' },
  purple: { cardBg: 'bg-purple-50 dark:bg-purple-950/30', iconBg: 'bg-purple-500', sparkColor: '#a855f7' },
  emerald: { cardBg: 'bg-emerald-50 dark:bg-emerald-950/30', iconBg: 'bg-emerald-500', sparkColor: '#10b981' },
  red: { cardBg: 'bg-red-50 dark:bg-red-950/30', iconBg: 'bg-red-500', sparkColor: '#ef4444' },
};

export default function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = 'violet',
  trend,
}: {
  icon: (props: { className?: string }) => JSX.Element;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: KpiAccent;
  // Optional real recent-history series (e.g. the last ~10 days of a count
  // this dashboard already tracks) rendered as a tiny sparkline. Left
  // unset for metrics the schema has no history for -- there is no
  // invented trend line filling that corner instead.
  trend?: number[];
}) {
  const a = ACCENTS[accent];
  return (
    <div
      className={`h-24 rounded-xl border border-slate-200/60 dark:border-slate-800 ${a.cardBg} px-4 py-3 flex flex-col justify-between shadow-sm`}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 text-white shadow-sm ${a.iconBg}`}>
            <Icon className="w-4 h-4" />
          </span>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{label}</p>
        </div>
        {trend && trend.length > 1 && <MiniSparkline points={trend} color={a.sparkColor} />}
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{value}</p>
        {sub && <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight text-right">{sub}</p>}
      </div>
    </div>
  );
}
