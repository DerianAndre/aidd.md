import { Outlet } from 'react-router-dom';
import { AppSidebar } from './app-sidebar';
import { AppHeader } from './app-header';
import { ErrorBoundary } from '../error-boundary';
import { useEntityWatcher } from '../../lib/hooks/use-entity-watcher';

export function AppLayout() {
  // Start file watcher — routes change events to feature stores
  useEntityWatcher();

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
