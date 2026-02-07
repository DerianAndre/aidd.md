import { useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
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
  Wind,
  StopCircle,
} from "lucide-react";
import { PageHeader } from "../../../components/layout/page-header";
import { StatCard } from "../../dashboard/components/stat-card";
import { DiscoveredMcpCard } from "../components/discovered-mcp-card";
import { PackageCard } from "../components/package-card";
import { useMcpHealthStore } from "../stores/mcp-health-store";
import { useMcpServersStore } from "../stores/mcp-servers-store";
import { useProjectStore } from "../../../stores/project-store";
import { ROUTES } from "../../../lib/constants";
import { MCP_PACKAGES } from "../lib/mcp-catalog";
import type {
  DiscoveredMcp,
  McpToolSource,
  McpServer,
} from "../../../lib/tauri";

// -- Tool metadata --------------------------------------------------------

const TOOL_META: Record<McpToolSource, { label: string; icon: typeof Bot }> = {
  claude_code: { label: "Claude Code", icon: Bot },
  cursor: { label: "Cursor", icon: MousePointer2 },
  vscode: { label: "VS Code", icon: Code },
  gemini: { label: "Gemini", icon: Sparkles },
  windsurf: { label: "Windsurf", icon: Wind },
};

const TOOL_ORDER: McpToolSource[] = [
  "claude_code",
  "cursor",
  "vscode",
  "gemini",
  "windsurf",
];

/** Maps package dir to the server id used by the Rust backend. */
const DIR_TO_SERVER_ID: Record<string, string> = {
  "mcp-aidd-engine": "engine",
  "mcp-aidd-core": "core",
  "mcp-aidd-memory": "memory",
  "mcp-aidd-tools": "tools",
};

// -- Component ------------------------------------------------------------

export function McpOverviewPage() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);

  // Health store -- discovered MCPs
  const {
    report,
    loading: healthLoading,
    stale: healthStale,
    fetch: fetchHealth,
    invalidate: invalidateHealth,
  } = useMcpHealthStore();

  // Servers store -- AIDD package lifecycle
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
    if (activeProject?.path && serversStale)
      void fetchServers(activeProject.path);
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
  const runningCount = servers.filter((s) => s.status === "running").length;
  const builtCount = packages.filter((p) => p.built).length;

  const handleStart = useCallback(
    async (serverId: string) => {
      await start(serverId, "hub_hosted");
    },
    [start],
  );

  const handleStop = useCallback(
    async (serverId: string) => {
      await stop(serverId);
    },
    [stop],
  );

  // -- Loading skeleton ---------------------------------------------------

  if (healthLoading && !report) {
    return (
      <div>
        <PageHeader
          title={t("page.mcp.title")}
          description={t("page.mcp.description")}
        />
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

  // -- Render -------------------------------------------------------------

  return (
    <div>
      <PageHeader
        title={t("page.mcp.title")}
        description={t("page.mcp.description")}
        actions={
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : <RefreshCw size={14} />}
            {t("common.refresh")}
          </Button>
        }
      />

      {/* -- Stat cards ---------------------------------------------------- */}
      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard
          label={t("page.mcp.totalDiscovered")}
          value={summary?.total_discovered ?? 0}
          icon={Server}
        />
        <StatCard
          label={t("page.mcp.aiddMcps")}
          value={summary?.aidd_count ?? 0}
          icon={Shield}
          color={summary && summary.aidd_count > 0 ? "success" : "default"}
        />
        <StatCard
          label={t("page.mcp.hubStatus")}
          value={
            summary
              ? summary.hub_error > 0
                ? `${summary.hub_running} / ${summary.hub_error} err`
                : `${summary.hub_running} running`
              : "\u2014"
          }
          icon={Zap}
          color={
            summary && summary.hub_error > 0
              ? "danger"
              : summary && summary.hub_running > 0
                ? "success"
                : "default"
          }
        />
        <StatCard
          label={t("page.mcp.packagesBuilt")}
          value={`${builtCount}/${packages.length}`}
          icon={Package}
          color={
            packages.length > 0 && builtCount === packages.length
              ? "success"
              : "default"
          }
        />
      </div>

      {/* -- Discovered MCPs ----------------------------------------------- */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {t("page.mcp.discoveredMcps")}
          </h2>
          {summary && (
            <Chip size="sm" color="default">
              {summary.total_discovered}
            </Chip>
          )}
        </div>

        {report && report.discovered.length === 0 && (
          <Card className="items-center p-8 text-center">
            <Server size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("page.mcp.noMcps")}
            </p>
            <Link
              to={ROUTES.INTEGRATIONS}
              className="mt-2 inline-block text-xs text-primary hover:underline"
            >
              {t("page.mcp.noMcpsHint")}
            </Link>
          </Card>
        )}

        <div className="flex flex-col gap-4">
          {TOOL_ORDER.map((toolKey) => {
            const entries = grouped.get(toolKey);
            if (!entries || entries.length === 0) return null;

            const meta = TOOL_META[toolKey];
            const ToolIcon = meta.icon;

            return (
              <Card key={toolKey}>
                <CardHeader className="flex-row items-center gap-2">
                  <ToolIcon size={16} className="text-muted-foreground" />
                  <CardTitle className="text-sm">{meta.label}</CardTitle>
                  <Chip size="sm" color="default">
                    {entries.length}
                  </Chip>
                </CardHeader>

                <CardContent className="flex flex-col gap-2">
                  {entries.map((entry) => (
                    <DiscoveredMcpCard
                      key={`${entry.tool}-${entry.scope}-${entry.name}-${entry.config_path}`}
                      entry={entry}
                      hubServer={hubServerMap.get(entry.name)}
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* -- AIDD Packages ------------------------------------------------- */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {t("page.mcp.aiddPackages")}
            </h2>
            <Chip size="sm" color="default">
              {MCP_PACKAGES.length}
            </Chip>
          </div>
          {runningCount > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => void stopAll()}
            >
              <StopCircle size={14} />
              {t("page.mcp.stopAll", { count: runningCount })}
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {MCP_PACKAGES.map((pkg) => {
            const status = packages.find((p) => p.name === pkg.name);
            const serverId = DIR_TO_SERVER_ID[pkg.dir];
            const server = serverId
              ? servers.find((s) => s.id === serverId)
              : undefined;
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
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">
              {t("page.mcp.integration")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {t("page.mcp.integrationHint")}
            </p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground">
              {`{
  "mcpServers": {
    "aidd-engine": {
      "command": "node",
      "args": ["mcps/mcp-aidd-engine/dist/index.js"],
    }
  }
}`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
