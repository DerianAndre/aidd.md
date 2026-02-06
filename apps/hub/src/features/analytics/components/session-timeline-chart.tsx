import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import type { TimelinePoint } from '../lib/compute-analytics';

interface SessionTimelineChartProps {
  data: TimelinePoint[];
}

export function SessionTimelineChart({ data }: SessionTimelineChartProps) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-default-400">No timeline data available.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis yAxisId="count" orientation="left" tick={{ fontSize: 10 }} />
        <YAxis yAxisId="compliance" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Tooltip />
        <Area
          yAxisId="count"
          type="monotone"
          dataKey="count"
          name="Sessions"
          stroke="oklch(0.55 0.18 255)"
          fill="oklch(0.55 0.18 255 / 0.15)"
        />
        <Area
          yAxisId="compliance"
          type="monotone"
          dataKey="avgCompliance"
          name="Avg Compliance"
          stroke="oklch(0.65 0.17 150)"
          fill="oklch(0.65 0.17 150 / 0.15)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
