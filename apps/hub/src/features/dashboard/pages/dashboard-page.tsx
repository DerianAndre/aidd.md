import { useEffect } from 'react';
import { Heart, BarChart3, Target, FileText } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { StatCard } from '../components/stat-card';
import { RecentSessionsWidget } from '../components/recent-sessions-widget';
import { HealthWidget } from '../components/health-widget';
import { MemoryWidget } from '../components/memory-widget';
import { McpHealthWidget } from '../../mcp/components/mcp-health-widget';
import { useAnalyticsStore } from '../../analytics/stores/analytics-store';
import { useDiagnosticsStore } from '../../diagnostics/stores/diagnostics-store';
import { useDraftsStore } from '../../drafts/stores/drafts-store';
import { useProjectStore } from '../../../stores/project-store';
import { scoreColor } from '../../../lib/utils';

export function DashboardPage() {
  const activeProject = useProjectStore((s) => s.activeProject);

  const { totalSessions, avgCompliance, stale: analyticsStale, fetch: fetchAnalytics } = useAnalyticsStore();
  const { healthScore, stale: diagStale, fetch: fetchDiag } = useDiagnosticsStore();
  const { drafts, stale: draftsStale, fetch: fetchDrafts } = useDraftsStore();

  useEffect(() => {
    if (!activeProject?.path) return;
    if (analyticsStale) void fetchAnalytics(activeProject.path);
    if (diagStale) void fetchDiag(activeProject.path);
    if (draftsStale) void fetchDrafts(activeProject.path);
  }, [activeProject?.path, analyticsStale, diagStale, draftsStale, fetchAnalytics, fetchDiag, fetchDrafts]);

  const pendingDrafts = drafts.filter((d) => d.status === 'pending').length;

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your AIDD framework" />

      {/* Row 1: Stat cards */}
      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard
          label="Health Score"
          value={healthScore?.overall ?? '\u2014'}
          icon={Heart}
          color={healthScore ? scoreColor(healthScore.overall) : 'default'}
        />
        <StatCard
          label="Sessions"
          value={totalSessions}
          icon={BarChart3}
        />
        <StatCard
          label="Avg Compliance"
          value={avgCompliance > 0 ? `${avgCompliance}%` : '\u2014'}
          icon={Target}
          color={avgCompliance > 0 ? scoreColor(avgCompliance) : 'default'}
        />
        <StatCard
          label="Pending Drafts"
          value={pendingDrafts}
          icon={FileText}
          color={pendingDrafts > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Row 2: Widgets */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Recent sessions */}
        <div className="rounded-xl border border-default-200 bg-default-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-default-600">Recent Sessions</h3>
          <RecentSessionsWidget />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Health */}
          <div className="rounded-xl border border-default-200 bg-default-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-default-600">Project Health</h3>
            <HealthWidget />
          </div>

          {/* MCP Status */}
          <div className="rounded-xl border border-default-200 bg-default-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-default-600">MCP Status</h3>
            <McpHealthWidget />
          </div>

          {/* Memory */}
          <div className="rounded-xl border border-default-200 bg-default-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-default-600">Permanent Memory</h3>
            <MemoryWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
