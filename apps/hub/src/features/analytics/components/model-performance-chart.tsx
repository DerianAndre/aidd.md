import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { ModelMetrics } from '../../../lib/types';

interface ModelPerformanceChartProps {
  metrics: ModelMetrics[];
}

export function ModelPerformanceChart({ metrics }: ModelPerformanceChartProps) {
  const data = metrics.map((m) => ({
    model: m.model.replace('claude-', '').replace(/-\d{8}$/, ''),
    compliance: m.avgComplianceScore,
    testPassRate: Math.round(m.testPassRate * 100),
  }));

  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-default-400">No model data available.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barGap={4}>
        <XAxis dataKey="model" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="compliance" name="Compliance %" fill="oklch(0.55 0.18 255)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="testPassRate" name="Test Pass %" fill="oklch(0.65 0.17 150)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
