import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import type { ToolUsageStat } from '../lib/compute-analytics';

interface ToolUsageChartProps {
  stats: ToolUsageStat[];
  limit?: number;
}

export function ToolUsageChart({ stats, limit = 10 }: ToolUsageChartProps) {
  const data = stats.slice(0, limit).map((s) => ({
    name: s.name.replace('aidd_', ''),
    count: s.count,
    goodRate: s.goodRate,
  }));

  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">No tool usage data available.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" barSize={16}>
        <XAxis type="number" tick={{ fontSize: 10 }} />
        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
        <Tooltip />
        <Bar dataKey="count" name="Usage Count" fill="oklch(0.55 0.18 255)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
