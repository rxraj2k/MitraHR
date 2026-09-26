import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { DashboardDepartmentSlice } from '../../types';

// Fixed categorical hue order, assigned by rank (not by department name) so
// the same slot always reads the same color regardless of which
// departments a given company actually has -- a department dropped from
// the list never reassigns everyone else's color.
const SLICE_COLORS = ['#4f46e5', '#0ea5e9', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#14b8a6', '#94a3b8'];

export default function DepartmentDonutChart({ data, height = 260 }: { data: DashboardDepartmentSlice[]; height?: number }) {
  if (data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <p className="text-sm text-slate-400">No department data yet.</p>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const donutScale = height / 260;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            innerRadius={58 * donutScale}
            outerRadius={88 * donutScale}
            paddingAngle={2}
            strokeWidth={2}
            stroke="#fff"
            style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.08))' }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value} (${total ? Math.round((value / total) * 100) : 0}%)`, name]}
            contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
      {/* Centered inside the donut hole -- positioned against the chart's
          plotting area, not the whole card, so it sits inside the ring
          rather than drifting toward the legend below it. */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
        style={{ top: '44%', transform: 'translate(-50%, -50%)' }}
      >
        <span className="text-xl font-bold text-slate-900 dark:text-white leading-none">{total}</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Total</span>
      </div>
    </div>
  );
}
