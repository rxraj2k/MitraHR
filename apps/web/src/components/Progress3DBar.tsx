// Shared 3D progress-bar track — a recessed (shadow-inner) pill track with
// a subtle border, and a fill with a soft inset top highlight so it reads
// as a raised bar rather than a flat rectangle. This is the same treatment
// introduced on Bench & Utilization's allocation bars, pulled out so every
// progress bar in the app (goal progress, training completion, response
// rates, checklist completion, skill/allocation meters, ...) can share it.
//
// Callers keep their own color-picking logic (red/amber/green thresholds,
// a fixed brand gradient, etc.) and just pass the resulting fill classes.
export default function Progress3DBar({
  percent,
  fillClassName,
  height = 'h-2',
  trackClassName = '',
}: {
  percent: number;
  fillClassName: string;
  height?: string;
  trackClassName?: string;
}) {
  const width = Math.min(100, Math.max(0, percent));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`${height} bg-slate-200/70 rounded-full overflow-hidden shadow-inner border border-slate-300/40 ${trackClassName}`}
    >
      <div
        className={`h-full rounded-full ${fillClassName} shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition-all duration-300`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
