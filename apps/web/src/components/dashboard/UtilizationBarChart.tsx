import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// Same five statuses, same colors, as Bench & Utilization's own
// STATUS_THEME (lib/statusTheme.ts) -- Bench/Training/Partial/Full/Over
// mean the same thing and carry the same hue everywhere in the app, this
// mini chart included. Direct value labels above each bar plus the named
// x-axis category means identity is never color-alone, so no legend is
// needed for a single-series, 5-category chart like this.
const BUCKETS: { key: 'bench' | 'inTraining' | 'partial' | 'full' | 'over'; name: string; color: string }[] = [
  { key: 'bench', name: 'Bench', color: '#64748B' },
  { key: 'inTraining', name: 'Training', color: '#A855F7' },
  { key: 'partial', name: 'Partial', color: '#F59E0B' },
  { key: 'full', name: 'Full', color: '#10B981' },
  { key: 'over', name: 'Over', color: '#EF4444' },
];

export interface UtilizationBuckets {
  bench: number;
  inTraining: number;
  partial: number;
  full: number;
  over: number;
}

export default function UtilizationBarChart({ summary, height = 220 }: { summary: UtilizationBuckets; height?: number }) {
  const data = BUCKETS.map((b) => ({ name: b.name, value: summary[b.key], color: b.color }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={24} />
        <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
          <LabelList dataKey="value" position="top" style={{ fontSize: 11, fontWeight: 600, fill: '#334155' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
