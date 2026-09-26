import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { AssetStatus } from '../../types';
import { ASSET_STATUSES, STATUS_LABELS as ASSET_STATUS_LABELS } from '../../lib/assetCategories';

// Same status vocabulary and color family as Asset Management's own
// STATUS_BADGE (lib/assetCategories.ts: green/indigo/amber/slate/red) --
// this mini donut is a second view of the same real assetStatusCounts the
// KPI bar's Asset Allocation Rate card already summarizes into one number.
const STATUS_COLORS: Record<AssetStatus, string> = {
  AVAILABLE: '#22c55e',
  ASSIGNED: '#6366f1',
  IN_REPAIR: '#f59e0b',
  RETIRED: '#94a3b8',
  LOST: '#ef4444',
};

export default function AssetStatusChart({ counts, height = 220 }: { counts: Record<string, number>; height?: number }) {
  const data = ASSET_STATUSES.map((status) => ({ status, name: ASSET_STATUS_LABELS[status], value: counts[status] || 0 })).filter(
    (d) => d.value > 0,
  );
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <p className="text-sm text-slate-400">No assets on file yet.</p>
      </div>
    );
  }

  const donutScale = height / 260;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={54 * donutScale}
            outerRadius={82 * donutScale}
            paddingAngle={2}
            strokeWidth={2}
            stroke="#fff"
            style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.08))' }}
          >
            {data.map((d) => (
              <Cell key={d.status} fill={STATUS_COLORS[d.status]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value} (${total ? Math.round((value / total) * 100) : 0}%)`, name]}
            contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none" style={{ top: '40%', transform: 'translate(-50%, -50%)' }}>
        <span className="text-xl font-bold text-slate-900 dark:text-white leading-none">{total}</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Assets</span>
      </div>
    </div>
  );
}
