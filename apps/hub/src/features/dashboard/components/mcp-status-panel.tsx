import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardAction, CardContent, CardFooter } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Cpu, ArrowRight } from "lucide-react";
import { McpPackageMiniCard } from "./mcp-package-mini-card";
import { useMcpServersStore } from "../../mcp/stores/mcp-servers-store";
import { useMcpHealthStore } from "../../mcp/stores/mcp-health-store";
import { MCP_SERVERS } from "../../mcp/lib/mcp-catalog";
import { useProjectStore } from "../../../stores/project-store";
import { ROUTES } from "../../../lib/constants";

const DIR_TO_SERVER_ID: Record<string, string> = {
  "mcp-aidd-engine": "engine",
  "mcp-aidd-core": "core",
  "mcp-aidd-memory": "memory",
  "mcp-aidd-tools": "tools",
};

/**
 * Get the effective server ID for a package
 * When engine is running, core/memory/tools are included (no standalone servers)
 */
function getEffectiveServerId(pkg: typeof MCP_SERVERS[0], engineRunning: boolean): string | undefined {
  if (engineRunning && ["mcp-aidd-core", "mcp-aidd-memory", "mcp-aidd-tools"].includes(pkg.dir)) {
    return "engine"; // Core/memory/tools are part of engine
  }
  return DIR_TO_SERVER_ID[pkg.dir];
}

export function McpStatusPanel() {
  const { t } = useTranslation();
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
  const runningCount = servers.filter((s) => s.status === "running").length;
  const engineRunning = servers.some((s) => s.id === "engine" && s.status === "running");
  const totalDiscovered = report?.summary.total_discovered ?? 0;
  const aiddCount = report?.summary.aidd_count ?? 0;
  const thirdPartyCount = report?.summary.third_party_count ?? 0;
  const toolsWithConfig = report?.summary.tools_with_config ?? [];

  return (
    <Card className="mb-4 border-primary/20 py-4 gap-3">
      {/* Header */}
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <Cpu size={18} />
          </div>
          <span className="text-sm font-semibold text-foreground">
            {t("page.dashboard.mcpEngine")}
          </span>
          <Chip
            size="sm"
            color={builtCount === MCP_SERVERS.length ? "success" : "warning"}
          >
            {t("page.dashboard.mcpBuilt", { count: builtCount })}
          </Chip>
          {runningCount > 0 && (
            <Chip size="sm" color="success">
              {t("page.dashboard.mcpRunning", { count: runningCount })}
            </Chip>
          )}
        </div>
        <CardAction>
          <Link
            to={ROUTES.MCP}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {t("common.view")} <ArrowRight size={12} />
          </Link>
        </CardAction>
      </CardHeader>

      {/* Package grid */}
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MCP_SERVERS.map((pkg) => {
            const status = packages.find((p) => p.dir === pkg.dir);
            const serverId = getEffectiveServerId(pkg, engineRunning);
            const server = serverId
              ? servers.find((s) => s.id === serverId)
              : undefined;
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
      </CardContent>

      {/* Discovery row */}
      {totalDiscovered > 0 && (
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            {t("page.dashboard.mcpDiscovery", { total: totalDiscovered })}
            {toolsWithConfig.length > 0 &&
              ` ${t("page.dashboard.mcpDiscoveryAcross", { tools: toolsWithConfig.join(", ") })}`}{" "}
            {t("page.dashboard.mcpDiscoveryBreakdown", {
              aidd: aiddCount,
              thirdParty: thirdPartyCount,
            })}
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
