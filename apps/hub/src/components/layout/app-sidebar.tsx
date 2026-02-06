import type { Key } from '@heroui/react';
import { ListBox, Select, Label, Header } from '@heroui/react';
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
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigationStore } from '../../stores/navigation-store';
import { useProjectStore } from '../../stores/project-store';
import { ROUTES } from '../../lib/constants';
import { cn } from '../../lib/utils';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
      { label: 'Projects', path: ROUTES.PROJECTS, icon: FolderKanban },
    ],
  },
  {
    label: 'Explore',
    items: [
      { label: 'Marketplace', path: ROUTES.MARKETPLACE, icon: Store },
    ],
  },
  {
    label: 'MCP',
    items: [
      { label: 'MCP Overview', path: ROUTES.MCP, icon: Server },
      { label: 'MCP Playground', path: ROUTES.MCP_PLAYGROUND, icon: Terminal },
    ],
  },
  {
    label: 'Framework',
    items: [
      { label: 'Agents', path: ROUTES.AGENTS, icon: Users },
      { label: 'Rules', path: ROUTES.FRAMEWORK_RULES, icon: ShieldCheck },
      { label: 'Skills', path: ROUTES.FRAMEWORK_SKILLS, icon: Zap },
      { label: 'Knowledge', path: ROUTES.FRAMEWORK_KNOWLEDGE, icon: BookOpen },
      { label: 'Workflows', path: ROUTES.FRAMEWORK_WORKFLOWS, icon: GitBranch },
      { label: 'Templates', path: ROUTES.FRAMEWORK_TEMPLATES, icon: FileText },
      { label: 'Spec', path: ROUTES.FRAMEWORK_SPEC, icon: ScrollText },
    ],
  },
  {
    label: 'Project Data',
    items: [
      { label: 'Sessions', path: ROUTES.SESSIONS, icon: History },
      { label: 'Observations', path: ROUTES.OBSERVATIONS, icon: Eye },
      { label: 'Permanent Memory', path: ROUTES.MEMORY, icon: Brain },
      { label: 'Overrides', path: ROUTES.OVERRIDES, icon: Layers },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Analytics', path: ROUTES.ANALYTICS, icon: BarChart3 },
      { label: 'Evolution', path: ROUTES.EVOLUTION, icon: Dna },
      { label: 'Drafts', path: ROUTES.DRAFTS, icon: FileStack },
      { label: 'Diagnostics', path: ROUTES.DIAGNOSTICS, icon: Activity },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Config', path: ROUTES.CONFIG, icon: Settings },
      { label: 'Integrations', path: ROUTES.INTEGRATIONS, icon: Plug },
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
        'flex h-screen flex-col border-r border-divider bg-content1 transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-divider p-3">
        {!collapsed && (
          <span className="text-sm font-semibold text-foreground">
            aidd.md Hub
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1 text-default-500 hover:bg-default-100 hover:text-foreground"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Project Switcher */}
      {!collapsed && projects.length > 0 && (
        <div className="border-b border-divider p-3">
          <Select
            value={activeProject ? activeProject.path : null}
            onChange={(value: Key | null) => {
              if (value) {
                switchProject(String(value));
              }
            }}
          >
            <Label>Project</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {projects.map((p) => (
                  <ListBox.Item key={p.path} id={p.path} textValue={p.name}>
                    {p.name}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ListBox
          aria-label="Navigation"
          selectedKeys={new Set([location.pathname])}
          onAction={(key) => navigate(String(key))}
        >
          {NAV_GROUPS.map((group) => (
            <ListBox.Section key={group.label}>
              {!collapsed && (
                <Header className="px-3 text-xs font-medium uppercase tracking-wider text-default-400">
                  {group.label}
                </Header>
              )}
              {group.items.map((item) => (
                <ListBox.Item
                  key={item.path}
                  id={item.path}
                  textValue={item.label}
                >
                  <item.icon size={18} className="shrink-0" />
                  {!collapsed && <Label>{item.label}</Label>}
                </ListBox.Item>
              ))}
            </ListBox.Section>
          ))}
        </ListBox>
      </nav>
    </aside>
  );
}
