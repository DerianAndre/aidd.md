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
        path: 'projects',
        element: lazyPage(() => import('./features/projects/pages/projects-page'), 'ProjectsPage'),
      },
      // Framework — unified tabbed view
      {
        path: 'framework',
        element: <Navigate to="/framework/rules" replace />,
      },
      {
        path: 'framework/:category',
        element: lazyPage(() => import('./features/framework/pages/framework-page'), 'FrameworkPage'),
      },
      // Agents (separate — single AGENTS.md file, not a framework category dir)
      {
        path: 'agents',
        element: lazyPage(() => import('./features/agents/pages/agents-list-page'), 'AgentsListPage'),
      },
      {
        path: 'agents/:name',
        element: lazyPage(() => import('./features/agents/pages/agent-detail-page'), 'AgentDetailPage'),
      },
      // Legacy list routes → redirect to framework
      {
        path: 'rules',
        element: <Navigate to="/framework/rules" replace />,
      },
      {
        path: 'skills',
        element: <Navigate to="/framework/skills" replace />,
      },
      {
        path: 'workflows',
        element: <Navigate to="/framework/workflows" replace />,
      },
      {
        path: 'templates',
        element: <Navigate to="/framework/templates" replace />,
      },
      {
        path: 'knowledge',
        element: <Navigate to="/framework/knowledge" replace />,
      },
      // Detail/editor routes (kept for deep linking)
      {
        path: 'rules/:name',
        element: lazyPage(() => import('./features/rules/pages/rule-editor-page'), 'RuleEditorPage'),
      },
      {
        path: 'skills/:name',
        element: lazyPage(() => import('./features/skills/pages/skill-detail-page'), 'SkillDetailPage'),
      },
      {
        path: 'skills/:name/edit',
        element: lazyPage(() => import('./features/skills/pages/skill-editor-page'), 'SkillEditorPage'),
      },
      {
        path: 'workflows/:name',
        element: lazyPage(() => import('./features/workflows/pages/workflow-detail-page'), 'WorkflowDetailPage'),
      },
      {
        path: 'templates/:name',
        element: lazyPage(() => import('./features/templates/pages/template-editor-page'), 'TemplateEditorPage'),
      },
      {
        path: 'knowledge/edit/*',
        element: lazyPage(() => import('./features/knowledge/pages/knowledge-editor-page'), 'KnowledgeEditorPage'),
      },
      {
        path: 'sessions',
        element: lazyPage(() => import('./features/memory/pages/sessions-page'), 'SessionsPage'),
      },
      {
        path: 'sessions/:id',
        element: lazyPage(() => import('./features/memory/pages/session-detail-page'), 'SessionDetailPage'),
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
        path: 'integrations',
        element: lazyPage(() => import('./features/integrations/pages/integrations-page'), 'IntegrationsPage'),
      },
      {
        path: 'overrides',
        element: lazyPage(() => import('./features/overrides/pages/overrides-page'), 'OverridesPage'),
      },
      {
        path: 'adapters',
        element: <Navigate to="/integrations" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
