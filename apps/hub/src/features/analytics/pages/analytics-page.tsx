import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  const { t } = useTranslation();
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
        <PageHeader title={t('page.analytics.title')} description={t('page.analytics.description')} />
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
        <PageHeader title={t('page.analytics.title')} description={t('page.analytics.description')} />
        <EmptyState message={t('page.analytics.noSessions')} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t('page.analytics.title')} description={t('page.analytics.description')} />

      {/* Summary stats */}
      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard label={t('page.analytics.sessions')} value={totalSessions} icon={BarChart3} />
        <StatCard label={t('page.analytics.avgCompliance')} value={`${avgCompliance}%`} icon={Target} />
        <StatCard label={t('page.analytics.testPassRate')} value={`${testPassRate}%`} icon={FlaskConical} />
        <StatCard label={t('page.analytics.modelsUsed')} value={uniqueModels} icon={Cpu} />
      </div>

      {/* Session timeline */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">{t('page.analytics.sessionsOverTime')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionTimelineChart data={timelineData} />
        </CardContent>
      </Card>

      {/* Two-column charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('page.analytics.modelPerformance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ModelPerformanceChart metrics={modelMetrics} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('page.analytics.toolUsage')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ToolUsageChart stats={toolStats} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
