import {
  useSidebar,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  labelKey: string;
  path: string;
  icon: LucideIcon;
}

interface NavGroup {
  labelKey: string;
  items: readonly NavItem[];
}

interface SidebarNavMainProps {
  groups: readonly NavGroup[];
}

/**
 * Main navigation component for sidebar
 * Renders navigation groups with tooltips when collapsed
 */
export function SidebarNavMain({ groups }: SidebarNavMainProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <TooltipProvider delayDuration={0}>
      {groups.map((group) => (
        <SidebarGroup key={group.labelKey}>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs uppercase tracking-wider">
              {t(group.labelKey as any)}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                const IconComponent = item.icon;

                return (
                  <SidebarMenuItem key={item.path}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          onClick={() => navigate(item.path)}
                        >
                          <button className="flex items-center gap-3">
                            <IconComponent size={18} />
                            {!isCollapsed && <span>{t(item.labelKey as any)}</span>}
                          </button>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right">
                          {t(item.labelKey as any)}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </TooltipProvider>
  );
}
