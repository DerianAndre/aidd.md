import { Outlet } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { ErrorBoundary } from "../error-boundary";
import { useEntityWatcher } from "../../lib/hooks/use-entity-watcher";
import { useProjectStore } from "../../stores/project-store";

export function AppLayout() {
  const loading = useProjectStore((s) => s.loading);

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
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
