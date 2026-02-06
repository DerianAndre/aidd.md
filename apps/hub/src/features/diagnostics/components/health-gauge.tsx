import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { scoreColor } from '../../../lib/utils';

const COLOR_MAP = {
  success: 'oklch(0.65 0.17 150)',
  warning: 'oklch(0.7 0.16 75)',
  danger: 'oklch(0.6 0.2 25)',
} as const;

interface HealthGaugeProps {
  score: number;
}

export function HealthGauge({ score }: HealthGaugeProps) {
  const color = COLOR_MAP[scoreColor(score)];
  const data = [{ value: score, fill: color }];

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width={180} height={180}>
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={210}
          endAngle={-30}
          barSize={12}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} angleAxisId={0} />
          <RadialBar dataKey="value" cornerRadius={6} background={{ fill: 'oklch(0.9 0 0)' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="-mt-24 flex flex-col items-center">
        <span className="text-3xl font-bold text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground">Health Score</span>
      </div>
    </div>
  );
}
