import { PageHeader } from '../../../components/layout/page-header';
import { ProjectContextBanner } from '../components/project-context-banner';
import { McpStatusPanel } from '../components/mcp-status-panel';
import { FrameworkOverviewGrid } from '../components/framework-overview-grid';
import { HealthDiagnosticsWidget } from '../components/health-diagnostics-widget';
import { IntelligenceWidget } from '../components/intelligence-widget';
import { MemoryWidget } from '../components/memory-widget';
import { EvolutionDraftsWidget } from '../components/evolution-drafts-widget';

export function DashboardPage() {
  return (
    <div>
      <PageHeader title="Dashboard" description="AIDD command center" />

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
        <div className="rounded-xl border border-border bg-muted/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Permanent Memory</h3>
          <MemoryWidget />
        </div>
        <EvolutionDraftsWidget />
      </div>
    </div>
  );
}
