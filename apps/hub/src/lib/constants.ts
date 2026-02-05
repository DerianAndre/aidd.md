export const ROUTES = {
  DASHBOARD: '/',
  AGENTS: '/agents',
  AGENT_DETAIL: '/agents/:name',
  RULES: '/rules',
  RULE_EDITOR: '/rules/:name',
  SKILLS: '/skills',
  SKILL_DETAIL: '/skills/:name',
  SKILL_EDITOR: '/skills/:name/edit',
  WORKFLOWS: '/workflows',
  WORKFLOW_DETAIL: '/workflows/:name',
  ORCHESTRATOR_DETAIL: '/workflows/orchestrators/:name',
  TEMPLATES: '/templates',
  TEMPLATE_EDITOR: '/templates/:name',
  KNOWLEDGE: '/knowledge',
  KNOWLEDGE_EDITOR: '/knowledge/:path',
  SESSIONS: '/sessions',
  SESSION_DETAIL: '/sessions/:id',
  OBSERVATIONS: '/observations',
  MEMORY: '/memory',
  ANALYTICS: '/analytics',
  EVOLUTION: '/evolution',
  DRAFTS: '/drafts',
  DIAGNOSTICS: '/diagnostics',
  MCP_SERVERS: '/mcp-servers',
  MCP_PLAYGROUND: '/mcp-playground',
  CONFIG: '/config',
  ADAPTERS: '/adapters',
  ONBOARDING: '/onboarding',
} as const;

export const POLLING_INTERVALS = {
  MCP_HEALTH: 5000,
  OBSERVATIONS: 10000,
} as const;

export const FILE_WATCHER_DEBOUNCE_MS = 100;
