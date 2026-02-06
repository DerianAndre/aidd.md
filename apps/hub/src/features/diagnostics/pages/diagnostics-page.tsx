import { useEffect } from 'react';
import { Skeleton, Card, Chip } from '@heroui/react';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { HealthGauge } from '../components/health-gauge';
import { CategoryBreakdown } from '../components/category-breakdown';
import { useDiagnosticsStore } from '../stores/diagnostics-store';
import { useProjectStore } from '../../../stores/project-store';

export function DiagnosticsPage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { healthScore, topMistakes, loading, stale, fetch } = useDiagnosticsStore();

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetch(activeProject.path);
    }
  }, [activeProject?.path, stale, fetch]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Diagnostics" description="Project health and error similarity" />
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-44 w-44 rounded-full" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!healthScore || healthScore.sessionsAnalyzed === 0) {
    return (
      <div>
        <PageHeader title="Diagnostics" description="Project health and error similarity" />
        <EmptyState message="No completed sessions yet. Health diagnostics will appear after your first session ends." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Diagnostics" description="Project health and error similarity" />

      {/* Health gauge — centered */}
      <div className="mb-6 flex justify-center">
        <HealthGauge score={healthScore.overall} />
      </div>

      {/* Category breakdown */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-default-600">Category Breakdown</h3>
        <CategoryBreakdown categories={healthScore.categories} />
      </div>

      {/* Recommendations */}
      {healthScore.recommendations.length > 0 && (
        <div className="mb-6 rounded-xl border border-default-200 bg-default-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-default-600">Recommendations</h3>
          <ul className="space-y-1">
            {healthScore.recommendations.map((rec, i) => (
              <li key={i} className="text-xs text-default-500">
                &bull; {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top recurring mistakes */}
      {topMistakes.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-default-600">
            Top Recurring Mistakes
          </h3>
          <div className="space-y-2">
            {topMistakes.map((m) => (
              <Card key={m.id} className="border border-default-200 bg-default-50">
                <Card.Header>
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{m.error}</span>
                    <Chip
                      size="sm"
                      variant="soft"
                      color={m.occurrences > 2 ? 'danger' : 'warning'}
                    >
                      {m.occurrences}x
                    </Chip>
                  </div>
                </Card.Header>
                <Card.Content className="pt-0 text-xs text-default-500">
                  <p><span className="font-medium text-foreground">Fix:</span> {m.fix}</p>
                  <p className="mt-1">
                    <span className="font-medium text-foreground">Prevention:</span> {m.prevention}
                  </p>
                </Card.Content>
              </Card>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-[10px] text-default-400">
        Based on {healthScore.sessionsAnalyzed} completed session{healthScore.sessionsAnalyzed !== 1 ? 's' : ''}.
      </p>
    </div>
  );
}
