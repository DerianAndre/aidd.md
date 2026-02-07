import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PageHeader } from '../../../components/layout/page-header';
import { ProjectContextBanner } from '../components/project-context-banner';
import { McpStatusPanel } from '../components/mcp-status-panel';
import { FrameworkOverviewGrid } from '../components/framework-overview-grid';
import { HealthDiagnosticsWidget } from '../components/health-diagnostics-widget';
import { IntelligenceWidget } from '../components/intelligence-widget';
import { MemoryWidget } from '../components/memory-widget';
import { EvolutionDraftsWidget } from '../components/evolution-drafts-widget';

export function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader title={t('page.dashboard.title')} description={t('page.dashboard.description')} />

      {/* A. Project identity + AIDD markers */}
      <ProjectContextBanner />

      {/* B. MCP Engine — prominent panel */}
      <McpStatusPanel />

      {/* C. Framework overview — 6 category cells */}
      <FrameworkOverviewGrid />

      {/* D. Two-column widget grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <HealthDiagnosticsWidget />
        <IntelligenceWidget />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('page.dashboard.permanentMemory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <MemoryWidget />
          </CardContent>
        </Card>
        <EvolutionDraftsWidget />
      </div>
    </div>
  );
}
