import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Target, FlaskConical, Cpu, Timer, Gauge, Sparkles } from 'lucide-react';
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
    avgStartupMs, avgContextEfficiency, avgTidBonus, auditDimensions,
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

      <div className="mb-6 grid gap-3 grid-cols-1 sm:grid-cols-3">
        <StatCard
          label={t('page.analytics.avgStartupMs')}
          value={`${avgStartupMs}ms`}
          icon={Timer}
        />
        <StatCard
          label={t('page.analytics.avgContextEfficiency')}
          value={avgContextEfficiency}
          icon={Gauge}
        />
        <StatCard
          label={t('page.analytics.avgTidBonus')}
          value={avgTidBonus}
          icon={Sparkles}
        />
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">{t('page.analytics.patternDimensions')}</CardTitle>
        </CardHeader>
        <CardContent>
          {auditDimensions ? (
            <div className="space-y-3">
              <DimensionRow
                label={t('page.analytics.lexicalDiversity')}
                value={auditDimensions.lexicalDiversity}
                max={20}
              />
              <DimensionRow
                label={t('page.analytics.structuralVariation')}
                value={auditDimensions.structuralVariation}
                max={20}
              />
              <DimensionRow
                label={t('page.analytics.voiceAuthenticity')}
                value={auditDimensions.voiceAuthenticity}
                max={20}
              />
              <DimensionRow
                label={t('page.analytics.patternAbsence')}
                value={auditDimensions.patternAbsence}
                max={20}
              />
              <DimensionRow
                label={t('page.analytics.semanticPreservation')}
                value={auditDimensions.semanticPreservation}
                max={20}
              />
              <DimensionRow
                label={t('page.analytics.tidBonus')}
                value={auditDimensions.tidBonus}
                max={15}
              />
              <DimensionRow
                label={t('page.analytics.totalScore')}
                value={auditDimensions.totalScore}
                max={115}
              />
              <p className="text-xs text-muted-foreground">
                {t('page.analytics.auditSamples', { count: auditDimensions.samples })}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t('page.analytics.noAuditScores')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DimensionRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
