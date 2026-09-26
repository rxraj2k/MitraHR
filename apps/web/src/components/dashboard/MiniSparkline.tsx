import { useId } from 'react';

// A tiny inline sparkline for a KPI card's corner -- deliberately NOT wired
// up to every card. It only ever plots a real recent-history series the
// dashboard already has (see KpiCard's `trend` prop doc); there is no
// synthetic "trending upward" line invented for metrics the schema has no
// history for.
export default function MiniSparkline({
  points,
  color = '#4f46e5',
  width = 60,
  height = 22,
}: {
  points: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const rawId = useId();
  // useId() includes colons (e.g. ":r0:"), which are not safe inside an
  // SVG id referenced via url(#id) -- strip them so the gradient actually
  // resolves in every browser.
  const gradientId = `spark-${rawId.replace(/:/g, '')}`;
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - ((p - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });
  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
