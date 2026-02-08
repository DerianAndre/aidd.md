import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  ShieldCheck,
  Zap,
  GitBranch,
  FileText,
  BookOpen,
  ScrollText,
  History,
  Eye,
  Brain,
  BarChart3,
  Dna,
  FileStack,
  Activity,
  Server,
  Terminal,
  Settings,
  Plug,
  Layers,
  PanelLeftClose,
  PanelLeft,
  Store,
  HelpCircle,
  FileArchive,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useNavigationStore } from "../../stores/navigation-store";
import { useProjectStore } from "../../stores/project-store";
import { ROUTES } from "../../lib/constants";
import { cn } from "../../lib/utils";
import { Logo } from "../ui/logo";

const NAV_GROUPS = [
  {
    labelKey: "nav.overview",
    items: [
      {
        labelKey: "nav.dashboard",
        path: ROUTES.DASHBOARD,
        icon: LayoutDashboard,
      },
      { labelKey: "nav.projects", path: ROUTES.PROJECTS, icon: FolderKanban },
    ],
  },
  {
    labelKey: "nav.explore",
    items: [
      { labelKey: "nav.marketplace", path: ROUTES.MARKETPLACE, icon: Store },
    ],
  },
  {
    labelKey: "nav.mcp",
    items: [
      { labelKey: "nav.mcpOverview", path: ROUTES.MCP, icon: Server },
      {
        labelKey: "nav.mcpPlayground",
        path: ROUTES.MCP_PLAYGROUND,
        icon: Terminal,
      },
    ],
  },
  {
    labelKey: "nav.framework",
    items: [
      { labelKey: "nav.agents", path: ROUTES.AGENTS, icon: Users },
      {
        labelKey: "nav.rules",
        path: ROUTES.FRAMEWORK_RULES,
        icon: ShieldCheck,
      },
      { labelKey: "nav.skills", path: ROUTES.FRAMEWORK_SKILLS, icon: Zap },
      {
        labelKey: "nav.knowledge",
        path: ROUTES.FRAMEWORK_KNOWLEDGE,
        icon: BookOpen,
      },
      {
        labelKey: "nav.workflows",
        path: ROUTES.FRAMEWORK_WORKFLOWS,
        icon: GitBranch,
      },
      {
        labelKey: "nav.templates",
        path: ROUTES.FRAMEWORK_TEMPLATES,
        icon: FileText,
      },
      { labelKey: "nav.spec", path: ROUTES.FRAMEWORK_SPEC, icon: ScrollText },
    ],
  },
  {
    labelKey: "nav.projectData",
    items: [
      { labelKey: "nav.sessions", path: ROUTES.SESSIONS, icon: History },
      { labelKey: "nav.observations", path: ROUTES.OBSERVATIONS, icon: Eye },
      { labelKey: "nav.permanentMemory", path: ROUTES.MEMORY, icon: Brain },
      { labelKey: "nav.overrides", path: ROUTES.OVERRIDES, icon: Layers },
      { labelKey: "nav.artifacts", path: ROUTES.ARTIFACTS, icon: FileArchive },
    ],
  },
  {
    labelKey: "nav.intelligence",
    items: [
      { labelKey: "nav.analytics", path: ROUTES.ANALYTICS, icon: BarChart3 },
      { labelKey: "nav.evolution", path: ROUTES.EVOLUTION, icon: Dna },
      { labelKey: "nav.drafts", path: ROUTES.DRAFTS, icon: FileStack },
      { labelKey: "nav.diagnostics", path: ROUTES.DIAGNOSTICS, icon: Activity },
    ],
  },
  {
    labelKey: "nav.system",
    items: [
      { labelKey: "nav.config", path: ROUTES.CONFIG, icon: Settings },
      { labelKey: "nav.integrations", path: ROUTES.INTEGRATIONS, icon: Plug },
      { labelKey: "nav.help", path: ROUTES.HELP, icon: HelpCircle },
    ],
  },
] as const;

export function AppSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useNavigationStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useNavigationStore((s) => s.toggleSidebar);
  const projects = useProjectStore((s) => s.projects);
  const activeProject = useProjectStore((s) => s.activeProject);
  const switchProject = useProjectStore((s) => s.switchProject);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-3">
        {!collapsed && <Logo className="h-10 opacity-90" />}
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={
            collapsed ? t("common.expandSidebar") : t("common.collapseSidebar")
          }
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Project Switcher */}
      {!collapsed && projects.length > 0 && (
        <div className="border-b border-border p-3">
          <Label className="mb-1.5 text-xs">{t("common.project")}</Label>
          <Select
            value={activeProject?.path ?? ""}
            onValueChange={(value) => switchProject(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.path} value={p.path}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2" aria-label="Navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.labelKey} className="mb-2">
            {!collapsed && (
              <span className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t(group.labelKey)}
              </span>
            )}
            <ul className="mt-0.5 space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      <item.icon size={18} className="shrink-0" />
                      {!collapsed && <span>{t(item.labelKey)}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
