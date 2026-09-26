import { Legend, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from 'recharts';

// Two concentric progress rings rather than another bar chart -- the row it
// sits in already has three bar charts, so a radial "gauge" reads as a
// distinct instrument at a glance instead of a fourth lookalike. Both
// figures are real (trainingCompletionPercent / quizPassRatePercent from
// the same dashboard-summary payload the KPI bar's cards use), just a
// second, more visual presentation of them.
export default function TrainingGaugeChart({
  trainingCompletionPercent,
  quizPassRatePercent,
  height = 220,
}: {
  trainingCompletionPercent: number;
  quizPassRatePercent: number;
  height?: number;
}) {
  const data = [
    { name: 'Assessment Pass Rate', value: quizPassRatePercent, fill: '#8b5cf6' },
    { name: 'Training Completion', value: trainingCompletionPercent, fill: '#14b8a6' },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadialBarChart
        data={data}
        innerRadius="34%"
        outerRadius="100%"
        startAngle={90}
        endAngle={-270}
        barCategoryGap="18%"
      >
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
        <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={8} />
        <Tooltip formatter={(v: number, name: string) => [`${v}%`, name]} contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }} />
        <Legend
          iconType="circle"
          layout="vertical"
          verticalAlign="middle"
          align="right"
          wrapperStyle={{ fontSize: 11, lineHeight: '20px' }}
          formatter={(value: string, entry: any) => `${value}: ${entry?.payload?.value ?? 0}%`}
        />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}
