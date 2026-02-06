import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Chip } from '@heroui/react';
import { Cpu, ArrowRight } from 'lucide-react';
import { McpPackageMiniCard } from './mcp-package-mini-card';
import { useMcpServersStore } from '../../mcp/stores/mcp-servers-store';
import { useMcpHealthStore } from '../../mcp/stores/mcp-health-store';
import { MCP_SERVERS } from '../../mcp/lib/mcp-catalog';
import { useProjectStore } from '../../../stores/project-store';
import { ROUTES } from '../../../lib/constants';

const DIR_TO_SERVER_ID: Record<string, string> = {
  'mcp-aidd-engine': 'engine',
  'mcp-aidd-core': 'core',
  'mcp-aidd-memory': 'memory',
  'mcp-aidd-tools': 'tools',
};

export function McpStatusPanel() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const packages = useMcpServersStore((s) => s.packages);
  const servers = useMcpServersStore((s) => s.servers);
  const pkgStale = useMcpServersStore((s) => s.stale);
  const fetchPackages = useMcpServersStore((s) => s.fetch);

  const report = useMcpHealthStore((s) => s.report);
  const healthStale = useMcpHealthStore((s) => s.stale);
  const fetchHealth = useMcpHealthStore((s) => s.fetch);

  useEffect(() => {
    if (activeProject?.path && pkgStale) void fetchPackages(activeProject.path);
  }, [activeProject?.path, pkgStale, fetchPackages]);

  useEffect(() => {
    if (healthStale) void fetchHealth(activeProject?.path);
  }, [healthStale, activeProject?.path, fetchHealth]);

  const builtCount = packages.filter((p) => p.built).length;
  const runningCount = servers.filter((s) => s.status === 'running').length;
  const totalDiscovered = report?.summary.total_discovered ?? 0;
  const aiddCount = report?.summary.aidd_count ?? 0;
  const thirdPartyCount = report?.summary.third_party_count ?? 0;
  const toolsWithConfig = report?.summary.tools_with_config ?? [];

  return (
    <div className="mb-4 rounded-xl border-2 border-primary-200 bg-default-50 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary-100 p-1.5 text-primary">
            <Cpu size={18} />
          </div>
          <span className="text-sm font-semibold text-foreground">MCP Engine</span>
          <Chip size="sm" variant="soft" color={builtCount === MCP_SERVERS.length ? 'success' : 'warning'}>
            {builtCount} built
          </Chip>
          {runningCount > 0 && (
            <Chip size="sm" variant="soft" color="success">
              {runningCount} running
            </Chip>
          )}
        </div>
        <Link
          to={ROUTES.MCP}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          View <ArrowRight size={12} />
        </Link>
      </div>

      {/* Package grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MCP_SERVERS.map((pkg) => {
          const status = packages.find((p) => p.dir === pkg.dir);
          const serverId = DIR_TO_SERVER_ID[pkg.dir];
          const server = serverId ? servers.find((s) => s.id === serverId) : undefined;
          return (
            <McpPackageMiniCard
              key={pkg.dir}
              info={pkg}
              status={status}
              server={server}
            />
          );
        })}
      </div>

      {/* Discovery row */}
      {totalDiscovered > 0 && (
        <p className="mt-3 text-xs text-default-400">
          Discovered: <span className="font-medium text-default-500">{totalDiscovered}</span> MCPs
          {toolsWithConfig.length > 0 && (
            <> across {toolsWithConfig.join(', ')}</>
          )}
          {' '}({aiddCount} AIDD, {thirdPartyCount} third-party)
        </p>
      )}
    </div>
  );
}
