import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { McpPackageInfo } from "../../mcp/lib/mcp-catalog";
import type { McpPackageStatus } from "../../mcp/stores/mcp-servers-store";
import type { McpServer } from "../../../lib/tauri";
import { ROUTES } from "../../../lib/constants";

const ROLE_COLORS: Record<string, string> = {
  engine: "text-gray-500",
  brain: "text-blue-500",
  memory: "text-green-500",
  hands: "text-yellow-500",
};

const SHORT_ROLES: Record<string, string> = {
  engine: "Engine",
  brain: "Brain",
  memory: "Memory",
  hands: "Tools",
};

interface McpPackageMiniCardProps {
  info: McpPackageInfo;
  status?: McpPackageStatus;
  server?: McpServer;
}

export function McpPackageMiniCard({
  info,
  status,
  server,
}: McpPackageMiniCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isRunning = server?.status === "running";
  const isBuilt = status?.built ?? false;
  const toolCount = info.tools.length;

  return (
    <button
      type="button"
      onClick={() => navigate(ROUTES.MCP)}
      className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/50 px-3 py-2 text-left transition-colors hover:border-primary hover:bg-accent/50"
    >
      {/* Status dot */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${
            isRunning ? "animate-ping bg-success opacity-75" : ""
          }`}
        />
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
            isRunning ? "bg-success" : isBuilt ? "bg-success" : "bg-danger"
          }`}
        />
      </span>

      <div className="min-w-0">
        <p
          className={`text-xs font-semibold ${ROLE_COLORS[info.role] ?? "text-muted-foreground"}`}
        >
          {SHORT_ROLES[info.role] ?? info.role}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {toolCount > 0
            ? t("page.dashboard.mcpTools", { count: toolCount })
            : info.role === "Foundation"
              ? t("page.dashboard.mcpTypes")
              : t("page.dashboard.mcpAggregate")}
        </p>
      </div>
    </button>
  );
}
