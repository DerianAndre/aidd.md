import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/app-layout';
// Lazy-load all feature pages
import { lazy, Suspense, type ComponentType } from 'react';
import { Spinner } from '@heroui/react';

function lazyPage(importFn: () => Promise<{ [key: string]: ComponentType }>, exportName: string) {
  const LazyComponent = lazy(async () => {
    const mod = await importFn();
    return { default: mod[exportName] as ComponentType };
  });
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Spinner /></div>}>
      <LazyComponent />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: lazyPage(() => import('./features/dashboard/pages/dashboard-page'), 'DashboardPage'),
      },
      {
        path: 'agents',
        element: lazyPage(() => import('./features/agents/pages/agents-list-page'), 'AgentsListPage'),
      },
      {
        path: 'rules',
        element: lazyPage(() => import('./features/rules/pages/rules-list-page'), 'RulesListPage'),
      },
      {
        path: 'skills',
        element: lazyPage(() => import('./features/skills/pages/skills-list-page'), 'SkillsListPage'),
      },
      {
        path: 'workflows',
        element: lazyPage(() => import('./features/workflows/pages/workflows-list-page'), 'WorkflowsListPage'),
      },
      {
        path: 'templates',
        element: lazyPage(() => import('./features/templates/pages/templates-list-page'), 'TemplatesListPage'),
      },
      {
        path: 'knowledge',
        element: lazyPage(() => import('./features/knowledge/pages/knowledge-page'), 'KnowledgePage'),
      },
      {
        path: 'sessions',
        element: lazyPage(() => import('./features/memory/pages/sessions-page'), 'SessionsPage'),
      },
      {
        path: 'observations',
        element: lazyPage(() => import('./features/memory/pages/observations-page'), 'ObservationsPage'),
      },
      {
        path: 'memory',
        element: lazyPage(() => import('./features/memory/pages/permanent-memory-page'), 'PermanentMemoryPage'),
      },
      {
        path: 'analytics',
        element: lazyPage(() => import('./features/analytics/pages/analytics-page'), 'AnalyticsPage'),
      },
      {
        path: 'evolution',
        element: lazyPage(() => import('./features/evolution/pages/evolution-page'), 'EvolutionPage'),
      },
      {
        path: 'drafts',
        element: lazyPage(() => import('./features/drafts/pages/drafts-page'), 'DraftsPage'),
      },
      {
        path: 'diagnostics',
        element: lazyPage(() => import('./features/diagnostics/pages/diagnostics-page'), 'DiagnosticsPage'),
      },
      {
        path: 'mcp-servers',
        element: lazyPage(() => import('./features/mcp-servers/pages/mcp-servers-page'), 'McpServersPage'),
      },
      {
        path: 'mcp-playground',
        element: lazyPage(() => import('./features/mcp-servers/pages/mcp-playground-page'), 'McpPlaygroundPage'),
      },
      {
        path: 'config',
        element: lazyPage(() => import('./features/config/pages/config-page'), 'ConfigPage'),
      },
      {
        path: 'adapters',
        element: lazyPage(() => import('./features/adapters/pages/adapters-page'), 'AdaptersPage'),
      },
    ],
  },
  {
    path: '/onboarding',
    element: lazyPage(() => import('./features/onboarding/pages/onboarding-page'), 'OnboardingPage'),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
