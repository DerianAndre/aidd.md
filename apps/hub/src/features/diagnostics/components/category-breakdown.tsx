import { scoreColor } from '../../../lib/utils';
import type { HealthScore } from '../../../lib/types';

const CATEGORY_LABELS: Record<string, string> = {
  sessionSuccess: 'Session Success',
  complianceAvg: 'Compliance Avg',
  errorRecurrence: 'Error Recurrence',
  modelConsistency: 'Model Consistency',
  memoryUtilization: 'Memory Utilization',
};

const BAR_COLORS = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
} as const;

interface CategoryBreakdownProps {
  categories: HealthScore['categories'];
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  const entries = Object.entries(categories) as [string, number][];

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="rounded-xl border border-default-200 bg-default-50 p-3"
        >
          <span className="text-[10px] font-medium uppercase text-default-400">
            {CATEGORY_LABELS[key] ?? key}
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">{value}</span>
            <div className="h-1.5 flex-1 rounded-full bg-default-200">
              <div
                className={`h-full rounded-full ${BAR_COLORS[scoreColor(value)]}`}
                style={{ width: `${Math.min(value, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
