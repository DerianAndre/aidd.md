import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, Chip, Spinner } from '@heroui/react';
import {
  RefreshCw,
  Server,
  Shield,
  Package,
  Zap,
  Bot,
  MousePointer2,
  Code,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { StatCard } from '../../dashboard/components/stat-card';
import { DiscoveredMcpCard } from '../components/discovered-mcp-card';
import { useMcpHealthStore } from '../stores/mcp-health-store';
import { useProjectStore } from '../../../stores/project-store';
import { ROUTES } from '../../../lib/constants';
import type { DiscoveredMcp, McpToolSource, McpServer } from '../../../lib/tauri';

const TOOL_META: Record<McpToolSource, { label: string; icon: typeof Bot }> = {
  claude_code: { label: 'Claude Code', icon: Bot },
  cursor: { label: 'Cursor', icon: MousePointer2 },
  vscode: { label: 'VS Code', icon: Code },
  gemini: { label: 'Gemini', icon: Sparkles },
};

const TOOL_ORDER: McpToolSource[] = ['claude_code', 'cursor', 'vscode', 'gemini'];

export function McpHealthPage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { report, loading, stale, fetch: fetchHealth, invalidate } = useMcpHealthStore();

  useEffect(() => {
    if (stale) void fetchHealth(activeProject?.path);
  }, [stale, activeProject?.path, fetchHealth]);

  const handleRefresh = () => {
    invalidate();
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

  return (
    <div>
      <PageHeader
        title="MCP Health"
        description="Status of all MCP servers across AI tools and scopes"
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

      {/* Summary row */}
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
          label="Third-Party"
          value={summary?.third_party_count ?? 0}
          icon={Package}
        />
        <StatCard
          label="Hub Running"
          value={summary?.hub_running ?? 0}
          icon={Zap}
          color={
            summary && summary.hub_error > 0
              ? 'danger'
              : summary && summary.hub_running > 0
                ? 'success'
                : 'default'
          }
        />
      </div>

      {/* Grouped sections by tool */}
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
                    key={`${entry.tool}-${entry.scope}-${entry.name}`}
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
  );
}
