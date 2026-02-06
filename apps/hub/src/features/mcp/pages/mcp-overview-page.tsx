import { useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button, Chip, Spinner, Skeleton } from '@heroui/react';
import {
  RefreshCw,
  Server,
  Shield,
  Zap,
  Package,
  Bot,
  MousePointer2,
  Code,
  Sparkles,
  StopCircle,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { StatCard } from '../../dashboard/components/stat-card';
import { DiscoveredMcpCard } from '../components/discovered-mcp-card';
import { PackageCard } from '../components/package-card';
import { useMcpHealthStore } from '../stores/mcp-health-store';
import { useMcpServersStore } from '../stores/mcp-servers-store';
import { useProjectStore } from '../../../stores/project-store';
import { ROUTES } from '../../../lib/constants';
import { MCP_PACKAGES } from '../lib/mcp-catalog';
import type { DiscoveredMcp, McpToolSource, McpServer } from '../../../lib/tauri';

// ── Tool metadata ────────────────────────────────────────────────

const TOOL_META: Record<McpToolSource, { label: string; icon: typeof Bot }> = {
  claude_code: { label: 'Claude Code', icon: Bot },
  cursor: { label: 'Cursor', icon: MousePointer2 },
  vscode: { label: 'VS Code', icon: Code },
  gemini: { label: 'Gemini', icon: Sparkles },
};

const TOOL_ORDER: McpToolSource[] = ['claude_code', 'cursor', 'vscode', 'gemini'];

/** Maps package dir to the server id used by the Rust backend. */
const DIR_TO_SERVER_ID: Record<string, string> = {
  'mcp-aidd': 'monolithic',
  'mcp-aidd-core': 'core',
  'mcp-aidd-memory': 'memory',
  'mcp-aidd-tools': 'tools',
};

// ── Component ────────────────────────────────────────────────────

export function McpOverviewPage() {
  const activeProject = useProjectStore((s) => s.activeProject);

  // Health store — discovered MCPs
  const {
    report,
    loading: healthLoading,
    stale: healthStale,
    fetch: fetchHealth,
    invalidate: invalidateHealth,
  } = useMcpHealthStore();

  // Servers store — AIDD package lifecycle
  const {
    packages,
    servers,
    loading: serversLoading,
    stale: serversStale,
    fetch: fetchServers,
    start,
    stop,
    stopAll,
  } = useMcpServersStore();

  // Fetch both stores on mount if stale
  useEffect(() => {
    if (healthStale) void fetchHealth(activeProject?.path);
  }, [healthStale, activeProject?.path, fetchHealth]);

  useEffect(() => {
    if (activeProject?.path && serversStale) void fetchServers(activeProject.path);
  }, [activeProject?.path, serversStale, fetchServers]);

  const loading = healthLoading || serversLoading;

  const handleRefresh = () => {
    invalidateHealth();
    void fetchHealth(activeProject?.path);
  };

  // Group discovered entries by tool source
  const grouped = useMemo(() => {
    if (!report) return new Map<McpToolSource, DiscoveredMcp[]>();
    const map = new Map<McpToolSource, DiscoveredMcp[]>();
    for (const entry of report.discovered) {
      const list = map.get(entry.tool) ?? [];
      list.push(entry);
      map.set(entry.tool, list);
    }
    return map;
  }, [report]);

  // Build a lookup for hub servers by name for correlation
  const hubServerMap = useMemo(() => {
    if (!report) return new Map<string, McpServer>();
    const map = new Map<string, McpServer>();
    for (const server of report.hub_servers) {
      map.set(server.name, server);
    }
    return map;
  }, [report]);

  const summary = report?.summary;
  const runningCount = servers.filter((s) => s.status === 'running').length;
  const builtCount = packages.filter((p) => p.built).length;

  const handleStart = useCallback(async (serverId: string) => {
    await start(serverId, 'hub_hosted');
  }, [start]);

  const handleStop = useCallback(async (serverId: string) => {
    await stop(serverId);
  }, [stop]);

  // ── Loading skeleton ────────────────────────────────────────────

  if (healthLoading && !report) {
    return (
      <div>
        <PageHeader title="MCP Overview" description="Unified view of all MCP servers across AI tools" />
        <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="MCP Overview"
        description="Unified view of all MCP servers across AI tools"
        actions={
          <Button
            size="sm"
            variant="ghost"
            onPress={handleRefresh}
            isDisabled={loading}
          >
            {loading ? <Spinner size="sm" /> : <RefreshCw size={14} />}
            Refresh
          </Button>
        }
      />

      {/* ── Stat cards ───────────────────────────────────────────── */}
      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard
          label="Total Discovered"
          value={summary?.total_discovered ?? 0}
          icon={Server}
        />
        <StatCard
          label="AIDD MCPs"
          value={summary?.aidd_count ?? 0}
          icon={Shield}
          color={summary && summary.aidd_count > 0 ? 'success' : 'default'}
        />
        <StatCard
          label="Hub Status"
          value={
            summary
              ? summary.hub_error > 0
                ? `${summary.hub_running} / ${summary.hub_error} err`
                : `${summary.hub_running} running`
              : '\u2014'
          }
          icon={Zap}
          color={
            summary && summary.hub_error > 0
              ? 'danger'
              : summary && summary.hub_running > 0
                ? 'success'
                : 'default'
          }
        />
        <StatCard
          label="Packages Built"
          value={`${builtCount}/${packages.length}`}
          icon={Package}
          color={packages.length > 0 && builtCount === packages.length ? 'success' : 'default'}
        />
      </div>

      {/* ── Discovered MCPs ──────────────────────────────────────── */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Discovered MCPs</h2>
          {summary && (
            <Chip size="sm" variant="soft" color="default">{summary.total_discovered}</Chip>
          )}
        </div>

        {report && report.discovered.length === 0 && (
          <div className="rounded-xl border border-default-200 bg-default-50 p-8 text-center">
            <Server size={32} className="mx-auto mb-3 text-default-300" />
            <p className="text-sm text-default-500">No MCP configurations found.</p>
            <Link
              to={ROUTES.INTEGRATIONS}
              className="mt-2 inline-block text-xs text-primary hover:underline"
            >
              Set up integrations to get started
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {TOOL_ORDER.map((toolKey) => {
            const entries = grouped.get(toolKey);
            if (!entries || entries.length === 0) return null;

            const meta = TOOL_META[toolKey];
            const ToolIcon = meta.icon;

            return (
              <div key={toolKey} className="rounded-xl border border-default-200 bg-default-50 p-4">
                {/* Section header */}
                <div className="mb-3 flex items-center gap-2">
                  <ToolIcon size={16} className="text-default-500" />
                  <h3 className="text-sm font-semibold text-default-600">{meta.label}</h3>
                  <Chip size="sm" variant="soft" color="default">
                    {entries.length}
                  </Chip>
                </div>

                {/* Entry list */}
                <div className="flex flex-col gap-2">
                  {entries.map((entry) => (
                    <DiscoveredMcpCard
                      key={`${entry.tool}-${entry.scope}-${entry.name}-${entry.config_path}`}
                      entry={entry}
                      hubServer={hubServerMap.get(entry.name)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── AIDD Packages ────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">AIDD Packages</h2>
            <Chip size="sm" variant="soft" color="default">{MCP_PACKAGES.length}</Chip>
          </div>
          {runningCount > 0 && (
            <Button size="sm" variant="danger" onPress={() => void stopAll()}>
              <StopCircle size={14} />
              Stop All ({runningCount})
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {MCP_PACKAGES.map((pkg) => {
            const status = packages.find((p) => p.name === pkg.name);
            const serverId = DIR_TO_SERVER_ID[pkg.dir];
            const server = serverId ? servers.find((s) => s.id === serverId) : undefined;
            return (
              <PackageCard
                key={pkg.name}
                info={pkg}
                status={status}
                server={server}
                onStart={handleStart}
                onStop={handleStop}
              />
            );
          })}
        </div>

        {/* Integration snippet */}
        <div className="mt-6 rounded-xl border border-default-200 bg-default-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Integration</h3>
          <p className="mb-3 text-xs text-default-500">
            Add AIDD MCP servers to your AI client configuration. Each server runs as a separate stdio process,
            or use the monolithic server for all tools in one process.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-default-100 p-3 text-xs text-default-700">
{`{
  "mcpServers": {
    "aidd": {
      "command": "node",
      "args": ["mcps/mcp-aidd/dist/index.js"],
      "env": { "AIDD_PROJECT_ROOT": "." }
    }
  }
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
