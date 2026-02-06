import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight } from 'lucide-react';
import { useDiagnosticsStore } from '../../diagnostics/stores/diagnostics-store';
import { useProjectStore } from '../../../stores/project-store';
import { scoreColor } from '../../../lib/utils';
import { ROUTES } from '../../../lib/constants';

const SUB_CATEGORIES: { key: keyof NonNullable<ReturnType<typeof useDiagnosticsStore.getState>['healthScore']>['categories']; label: string }[] = [
  { key: 'sessionSuccess', label: 'Sessions' },
  { key: 'complianceAvg', label: 'Compliance' },
  { key: 'errorRecurrence', label: 'Error Mgmt' },
  { key: 'modelConsistency', label: 'Model' },
  { key: 'memoryUtilization', label: 'Memory' },
];

function barColor(value: number): string {
  if (value >= 70) return 'bg-success';
  if (value >= 40) return 'bg-warning';
  return 'bg-danger';
}

export function HealthDiagnosticsWidget() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const healthScore = useDiagnosticsStore((s) => s.healthScore);
  const loading = useDiagnosticsStore((s) => s.loading);
  const stale = useDiagnosticsStore((s) => s.stale);
  const fetchDiag = useDiagnosticsStore((s) => s.fetch);

  useEffect(() => {
    if (activeProject?.path && stale) void fetchDiag(activeProject.path);
  }, [activeProject?.path, stale, fetchDiag]);

  return (
    <div className="rounded-xl border border-border bg-muted/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Health & Diagnostics</h3>
        <Link
          to={ROUTES.DIAGNOSTICS}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Details <ArrowRight size={12} />
        </Link>
      </div>

      {loading ? (
        <Skeleton className="h-32 rounded-lg" />
      ) : !healthScore ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No health data. Complete sessions to generate scores.
        </p>
      ) : (
        <>
          {/* Overall score */}
          <div className="mb-4 flex items-baseline gap-1">
            <span className={`text-3xl font-bold text-${scoreColor(healthScore.overall)}`}>
              {healthScore.overall}
            </span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>

          {/* Sub-score bars */}
          <div className="space-y-2">
            {SUB_CATEGORIES.map(({ key, label }) => {
              const value = healthScore.categories[key];
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-border">
                    <div
                      className={`h-full rounded-full ${barColor(value)}`}
                      style={{ width: `${Math.min(value, 100)}%` }}
                    />
                  </div>
                  <span className="w-7 shrink-0 text-right text-[10px] font-medium text-muted-foreground">
                    {value}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Recommendations */}
          {healthScore.recommendations.length > 0 && (
            <div className="mt-3 border-t border-border pt-2">
              {healthScore.recommendations.slice(0, 2).map((rec, i) => (
                <p key={i} className="text-[10px] text-muted-foreground">
                  &bull; {rec}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
