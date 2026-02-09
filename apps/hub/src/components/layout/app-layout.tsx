import { Outlet } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { ErrorBoundary } from "../error-boundary";
import { useEntityWatcher } from "../../lib/hooks/use-entity-watcher";
import { useProjectStore } from "../../stores/project-store";
import { useNavigationStore } from "../../stores/navigation-store";
import { AppFooter } from "./app-footer";

export function AppLayout() {
  const loading = useProjectStore((s) => s.loading);
  const sidebarCollapsed = useNavigationStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useNavigationStore((s) => s.setSidebarCollapsed);

  // Start file watcher — routes change events to feature stores
  useEntityWatcher();

  // Wait for project store to initialize
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <SidebarProvider
      open={!sidebarCollapsed}
      onOpenChange={(open) => setSidebarCollapsed(!open)}
    >
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex flex-col flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
          <AppFooter />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
