import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight } from 'lucide-react';
import { useDiagnosticsStore } from '../../diagnostics/stores/diagnostics-store';
import { useProjectStore } from '../../../stores/project-store';
import { scoreColor } from '../../../lib/utils';
import { ROUTES } from '../../../lib/constants';

const SUB_CATEGORIES = [
  { key: 'sessionSuccess' as const, labelKey: 'page.dashboard.catSessions' as const },
  { key: 'complianceAvg' as const, labelKey: 'page.dashboard.catCompliance' as const },
  { key: 'errorRecurrence' as const, labelKey: 'page.dashboard.catErrorMgmt' as const },
  { key: 'modelConsistency' as const, labelKey: 'page.dashboard.catModel' as const },
  { key: 'memoryUtilization' as const, labelKey: 'page.dashboard.catMemory' as const },
] satisfies { key: keyof NonNullable<ReturnType<typeof useDiagnosticsStore.getState>['healthScore']>['categories']; labelKey: string }[];

function barColor(value: number): string {
  if (value >= 70) return 'bg-success';
  if (value >= 40) return 'bg-warning';
  return 'bg-danger';
}

export function HealthDiagnosticsWidget() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const healthScore = useDiagnosticsStore((s) => s.healthScore);
  const loading = useDiagnosticsStore((s) => s.loading);
  const stale = useDiagnosticsStore((s) => s.stale);
  const fetchDiag = useDiagnosticsStore((s) => s.fetch);

  useEffect(() => {
    if (activeProject?.path && stale) void fetchDiag(activeProject.path);
  }, [activeProject?.path, stale, fetchDiag]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{t('page.dashboard.healthDiagnostics')}</CardTitle>
        <CardAction>
          <Link
            to={ROUTES.DIAGNOSTICS}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {t('common.details')} <ArrowRight size={12} />
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent>
        {loading ? (
          <Skeleton className="h-32 rounded-lg" />
        ) : !healthScore ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {t('page.dashboard.noHealthScores')}
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
              {SUB_CATEGORIES.map(({ key, labelKey }) => {
                const value = healthScore.categories[key];
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">{t(labelKey)}</span>
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
              <>
                <Separator className="mt-3" />
                <div className="pt-2">
                  {healthScore.recommendations.slice(0, 2).map((rec, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground">
                      &bull; {rec}
                    </p>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
