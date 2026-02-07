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
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNavigationStore } from "../../stores/navigation-store";
import { useProjectStore } from "../../stores/project-store";
import { ROUTES } from "../../lib/constants";
import { cn } from "../../lib/utils";
import { Logo } from "../ui/logo";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: ROUTES.DASHBOARD, icon: LayoutDashboard },
      { label: "Projects", path: ROUTES.PROJECTS, icon: FolderKanban },
    ],
  },
  {
    label: "Explore",
    items: [{ label: "Marketplace", path: ROUTES.MARKETPLACE, icon: Store }],
  },
  {
    label: "MCP",
    items: [
      { label: "MCP Overview", path: ROUTES.MCP, icon: Server },
      { label: "MCP Playground", path: ROUTES.MCP_PLAYGROUND, icon: Terminal },
    ],
  },
  {
    label: "Framework",
    items: [
      { label: "Agents", path: ROUTES.AGENTS, icon: Users },
      { label: "Rules", path: ROUTES.FRAMEWORK_RULES, icon: ShieldCheck },
      { label: "Skills", path: ROUTES.FRAMEWORK_SKILLS, icon: Zap },
      { label: "Knowledge", path: ROUTES.FRAMEWORK_KNOWLEDGE, icon: BookOpen },
      { label: "Workflows", path: ROUTES.FRAMEWORK_WORKFLOWS, icon: GitBranch },
      { label: "Templates", path: ROUTES.FRAMEWORK_TEMPLATES, icon: FileText },
      { label: "Spec", path: ROUTES.FRAMEWORK_SPEC, icon: ScrollText },
    ],
  },
  {
    label: "Project Data",
    items: [
      { label: "Sessions", path: ROUTES.SESSIONS, icon: History },
      { label: "Observations", path: ROUTES.OBSERVATIONS, icon: Eye },
      { label: "Permanent Memory", path: ROUTES.MEMORY, icon: Brain },
      { label: "Overrides", path: ROUTES.OVERRIDES, icon: Layers },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Analytics", path: ROUTES.ANALYTICS, icon: BarChart3 },
      { label: "Evolution", path: ROUTES.EVOLUTION, icon: Dna },
      { label: "Drafts", path: ROUTES.DRAFTS, icon: FileStack },
      { label: "Diagnostics", path: ROUTES.DIAGNOSTICS, icon: Activity },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Config", path: ROUTES.CONFIG, icon: Settings },
      { label: "Integrations", path: ROUTES.INTEGRATIONS, icon: Plug },
    ],
  },
] as const;

export function AppSidebar() {
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
        {!collapsed && <Logo className="h-10 opacity-75" />}
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Project Switcher */}
      {!collapsed && projects.length > 0 && (
        <div className="border-b border-border p-3">
          <Label className="mb-1.5 text-xs">Project</Label>
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
          <div key={group.label} className="mb-2">
            {!collapsed && (
              <span className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
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
                      {!collapsed && <span>{item.label}</span>}
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
