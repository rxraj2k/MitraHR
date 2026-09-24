import { ReactNode } from 'react';

// Inner content for a 3D metric tile (icon chip + label + big number +
// optional sub-line), styled for the saturated gradient backgrounds from
// lib/tileThemes.ts. This is presentational only — wrap it in a <div>,
// <button> (for click-to-filter) or react-router <Link> (for a dashboard
// shortcut) using tileWrapperClass() from lib/tileThemes for the outer
// gradient/shadow/hover-lift chrome.
export default function MetricTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: (props: { className?: string }) => JSX.Element;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/25 text-white flex-shrink-0 shadow-inner">
          <Icon className="w-4 h-4" />
        </span>
        <p className="text-xs font-semibold text-white/90">{label}</p>
      </div>
      <p className="text-3xl font-bold text-white mt-3 drop-shadow-sm">{value}</p>
      {sub && <p className="text-xs text-white/80 mt-1">{sub}</p>}
    </>
  );
}
