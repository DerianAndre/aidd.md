import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/ui/logo";
import { SidebarNavMain } from "./sidebar/sidebar-nav-main";
import { SidebarProjectSwitcher } from "./sidebar/sidebar-project-switcher";
import { NAV_GROUPS } from "@/lib/constants";

/**
 * Main application sidebar with shadcn/ui components
 * Collapses to icons with tooltips
 * State managed by Zustand via controlled SidebarProvider in app-layout.tsx
 */
export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border flex flex-col h-full">
      <SidebarHeader className="border-b border-sidebar-border flex-shrink-0">
        <div className={`flex items-center px-3 py-3 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && <Logo className="h-10 opacity-90" />}
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent className={`flex-1 overflow-y-auto! overflow-x-hidden min-h-0 group-data-[collapsible=icon]:overflow-y-auto! ${isCollapsed ? 'scrollbar-hover-only' : ''}`}>
        <SidebarProjectSwitcher />
        <SidebarNavMain groups={NAV_GROUPS} />
      </SidebarContent>

      <SidebarFooter className="flex-shrink-0">
        {/* Reserved for future user menu */}
      </SidebarFooter>
    </Sidebar>
  );
}
