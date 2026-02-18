import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, TrendingUp, Server, GitCompare } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { OverviewTab } from '../components/overview-tab';
import { TrendTab } from '../components/trend-tab';
import { SystemTab } from '../components/system-tab';
import { SessionsTab } from '../components/sessions-tab';
import { useDiagnosticsStore } from '../stores/diagnostics-store';
import { useProjectStore } from '../../../stores/project-store';

export function DiagnosticsPage() {
  const { t } = useTranslation();
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
        <PageHeader title={t('page.diagnostics.title')} description={t('page.diagnostics.description')} />
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-44 w-44 rounded-full" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t('page.diagnostics.title')} description={t('page.diagnostics.description')} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <Activity size={14} /> {t('page.diagnostics.tabs.overview')}
          </TabsTrigger>
          <TabsTrigger value="trending">
            <TrendingUp size={14} /> {t('page.diagnostics.tabs.trending')}
          </TabsTrigger>
          <TabsTrigger value="system">
            <Server size={14} /> {t('page.diagnostics.tabs.system')}
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <GitCompare size={14} /> {t('page.diagnostics.tabs.sessions')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          {!healthScore || healthScore.sessionsAnalyzed === 0 ? (
            <EmptyState message={t('page.diagnostics.noSessions')} />
          ) : (
            <OverviewTab healthScore={healthScore} topMistakes={topMistakes} />
          )}
        </TabsContent>

        <TabsContent value="trending" className="pt-4">
          <TrendTab />
        </TabsContent>

        <TabsContent value="system" className="pt-4">
          <SystemTab />
        </TabsContent>

        <TabsContent value="sessions" className="pt-4">
          <SessionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
