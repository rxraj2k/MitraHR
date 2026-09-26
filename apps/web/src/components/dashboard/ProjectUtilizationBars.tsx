import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DashboardProjectUtilization } from '../../types';

// A real horizontal bar chart (axis, gridlines, hover tooltip) rather than
// plain HTML progress-track divs -- same underlying utilizationPercent
// figure per active project, just rendered as an actual chart. The status
// read (Full/Optimal/Moderate/Under-staffed) is a threshold label on that
// real number, not a new figure, and drives each bar's color.
interface StatusStyle {
  label: string;
  color: string;
}

function statusFor(pct: number): StatusStyle {
  if (pct >= 90) return { label: 'Full', color: '#6366f1' };
  if (pct >= 60) return { label: 'Optimal', color: '#0ea5e9' };
  if (pct >= 30) return { label: 'Moderate', color: '#f59e0b' };
  return { label: 'Under-staffed', color: '#f43f5e' };
}

function truncateName(name: string, max = 14): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export default function ProjectUtilizationBars({ data, height = 220 }: { data: DashboardProjectUtilization[]; height?: number }) {
  if (data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <p className="text-sm text-slate-400 text-center px-4">No active projects with assigned resources yet.</p>
      </div>
    );
  }

  const chartData = data.map((p) => ({ ...p, statusColor: statusFor(p.utilizationPercent).color }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 28, left: 4, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} unit="%" />
        <YAxis
          type="category"
          dataKey="name"
          width={82}
          tickFormatter={(v: string) => truncateName(v)}
          tick={{ fontSize: 11, fill: '#334155' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number, _name: string, entry: any) => [
            `${value}% · ${entry?.payload?.assignedCount ?? 0} assigned (${statusFor(value).label})`,
            'Utilization',
          ]}
          labelFormatter={(v: string) => v}
          contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
          cursor={{ fill: '#f8fafc' }}
        />
        <Bar dataKey="utilizationPercent" radius={[0, 4, 4, 0]} maxBarSize={16}>
          {chartData.map((d) => (
            <Cell key={d.id} fill={d.statusColor} />
          ))}
          <LabelList dataKey="utilizationPercent" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 10, fontWeight: 600, fill: '#334155' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
