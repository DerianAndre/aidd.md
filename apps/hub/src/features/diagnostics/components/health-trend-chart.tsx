import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { formatDate } from '../../../lib/utils';
import type { HealthSnapshot } from '../lib/types';

interface HealthTrendChartProps {
  snapshots: HealthSnapshot[];
}

export function HealthTrendChart({ snapshots }: HealthTrendChartProps) {
  if (snapshots.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">No snapshots available.</p>;
  }

  const data = snapshots.map((s) => ({
    ...s,
    date: formatDate(s.timestamp),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="overall"
          name="Overall"
          stroke="oklch(0.55 0.18 255)"
          fill="oklch(0.55 0.18 255 / 0.15)"
        />
        <Area
          type="monotone"
          dataKey="complianceAvg"
          name="Compliance"
          stroke="oklch(0.65 0.17 150)"
          fill="oklch(0.65 0.17 150 / 0.08)"
        />
        <Area
          type="monotone"
          dataKey="sessionSuccess"
          name="Sessions"
          stroke="oklch(0.7 0.16 75)"
          fill="oklch(0.7 0.16 75 / 0.08)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
