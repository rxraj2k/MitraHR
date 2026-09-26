import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DashboardAttendanceTrendPoint } from '../../types';

// Same axis/grid/tooltip conventions as reports/ReportsPreview.tsx's charts
// (light gridlines, no vertical rules, slate tick color) so a Home
// dashboard chart and a Reports & Analytics chart read as one visual
// language rather than two visually different chart setups bolted together.
//
// Grouped bars, not stacked -- Present and On Leave aren't parts of one
// whole (there's no fixed daily denominator being split), so a grouped
// comparison per day is the honest read. Fixed categorical color order
// (indigo = Present, amber = On Leave) matches the rest of the dashboard's
// use of those two hues for the same two concepts.
function formatDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function AttendanceTrendChart({ data, height = 220 }: { data: DashboardAttendanceTrendPoint[]; height?: number }) {
  if (data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <p className="text-sm text-slate-400">No attendance recorded for this period yet.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="20%">
        <CartesianGrid stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateLabel}
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
          minTickGap={22}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={24} />
        <Tooltip
          labelFormatter={(v: string) => formatDateLabel(v)}
          contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
          cursor={{ fill: '#f8fafc' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        <Bar dataKey="present" name="Present" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={16} />
        <Bar dataKey="onLeave" name="On Leave" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
