import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Target, FlaskConical, Cpu } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { StatCard } from '../components/stat-card';
import { ModelPerformanceChart } from '../components/model-performance-chart';
import { SessionTimelineChart } from '../components/session-timeline-chart';
import { ToolUsageChart } from '../components/tool-usage-chart';
import { useAnalyticsStore } from '../stores/analytics-store';
import { useProjectStore } from '../../../stores/project-store';

export function AnalyticsPage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const {
    modelMetrics, toolStats, timelineData,
    totalSessions, avgCompliance, testPassRate, uniqueModels,
    loading, stale, fetch,
  } = useAnalyticsStore();

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetch(activeProject.path);
    }
  }, [activeProject?.path, stale, fetch]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Analytics" description="Model performance and session metrics" />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-4 h-56 rounded-xl" />
      </div>
    );
  }

  if (totalSessions === 0) {
    return (
      <div>
        <PageHeader title="Analytics" description="Model performance and session metrics" />
        <EmptyState message="No completed sessions yet. Analytics will appear after your first session ends." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Analytics" description="Model performance and session metrics" />

      {/* Summary stats */}
      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard label="Sessions" value={totalSessions} icon={BarChart3} />
        <StatCard label="Avg Compliance" value={`${avgCompliance}%`} icon={Target} />
        <StatCard label="Test Pass Rate" value={`${testPassRate}%`} icon={FlaskConical} />
        <StatCard label="Models Used" value={uniqueModels} icon={Cpu} />
      </div>

      {/* Session timeline */}
      <div className="mb-6 rounded-xl border border-border bg-muted/50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Sessions Over Time</h3>
        <SessionTimelineChart data={timelineData} />
      </div>

      {/* Two-column charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-muted/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Model Performance</h3>
          <ModelPerformanceChart metrics={modelMetrics} />
        </div>
        <div className="rounded-xl border border-border bg-muted/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Tool Usage</h3>
          <ToolUsageChart stats={toolStats} />
        </div>
      </div>
    </div>
  );
}
