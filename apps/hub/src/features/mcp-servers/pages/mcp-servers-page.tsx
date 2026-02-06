import { useEffect } from 'react';
import { Skeleton } from '@heroui/react';
import { Wrench, BookOpen, MessageSquare, Package } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { StatCard } from '../../dashboard/components/stat-card';
import { PackageCard } from '../components/package-card';
import { useProjectStore } from '../../../stores/project-store';
import { useMcpServersStore } from '../stores/mcp-servers-store';
import { MCP_PACKAGES, getCatalogStats } from '../lib/mcp-catalog';

export function McpServersPage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { packages, loading, stale, fetch } = useMcpServersStore();

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetch(activeProject.path);
    }
  }, [activeProject?.path, stale, fetch]);

  const stats = getCatalogStats();

  if (loading) {
    return (
      <div>
        <PageHeader title="MCP Servers" description="AIDD MCP package ecosystem" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="MCP Servers" description="AIDD MCP package ecosystem" />

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Packages" value={stats.totalPackages} icon={Package} />
        <StatCard label="Tools" value={stats.totalTools} icon={Wrench} color="success" />
        <StatCard label="Resources" value={stats.totalResources} icon={BookOpen} />
        <StatCard label="Prompts" value={stats.totalPrompts} icon={MessageSquare} />
      </div>

      {/* Package cards */}
      <div className="space-y-4">
        {MCP_PACKAGES.map((pkg) => {
          const status = packages.find((p) => p.name === pkg.name);
          return <PackageCard key={pkg.name} info={pkg} status={status} />;
        })}
      </div>

      {/* Integration instructions */}
      <div className="mt-8 rounded-xl border border-default-200 bg-default-50 p-4">
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
  );
}
