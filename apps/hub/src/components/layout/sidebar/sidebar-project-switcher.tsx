import {
  useSidebar,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FolderKanban } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "../../../stores/project-store";

/**
 * Project switcher for sidebar
 * Shows full dropdown when expanded, icon with tooltip when collapsed
 */
export function SidebarProjectSwitcher() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const projects = useProjectStore((s) => s.projects);
  const activeProject = useProjectStore((s) => s.activeProject);
  const switchProject = useProjectStore((s) => s.switchProject);

  // Don't render if no projects
  if (projects.length === 0) return null;

  // Collapsed state: icon only with tooltip in sidebar structure
  if (isCollapsed) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton size="lg" className="justify-center">
                    <FolderKanban size={18} />
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {activeProject?.name ?? t("common.project" as any)}
                </TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  // Expanded state: full select with sidebar styling
  return (
    <SidebarGroup className="border-b border-sidebar-border pb-2">
      <SidebarGroupContent className="px-2">
        <Label className="px-2 text-xs text-sidebar-foreground/70 mb-1.5 block">
          {t("common.project" as any)}
        </Label>
        <Select
          value={activeProject?.path ?? ""}
          onValueChange={(value) => switchProject(value)}
        >
          <SelectTrigger className="w-full h-8">
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
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
