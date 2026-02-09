import { normalizePath } from './utils';

// ---------------------------------------------------------------------------
// AIDD Framework Constants — SSOT for Hub frontend
// Mirrors packages/shared/src/paths.ts (can't import due to Node.js fs dep).
// ---------------------------------------------------------------------------

/** All content categories — must match Rust FRAMEWORK_CATEGORIES and shared ContentPaths */
export const CONTENT_CATEGORIES = [
  'agents', 'rules', 'skills', 'workflows', 'specs', 'knowledge', 'templates',
] as const;
export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];

/** Entity categories — subset with dedicated entity stores (no store for agents/specs) */
export const ENTITY_CATEGORIES = [
  'rules', 'skills', 'workflows', 'templates', 'knowledge',
] as const;
export type EntityCategory = (typeof ENTITY_CATEGORIES)[number];

/** .aidd root directory name */
export const AIDD_DIR = '.aidd';

/** Content base directory name (relative to project root or .aidd/) */
export const CONTENT_BASE = 'content';

/** Content paths by category (relative to project root) */
export const CONTENT_PATHS: Record<ContentCategory, string> = {
  agents: `${CONTENT_BASE}/agents`,
  rules: `${CONTENT_BASE}/rules`,
  skills: `${CONTENT_BASE}/skills`,
  workflows: `${CONTENT_BASE}/workflows`,
  specs: `${CONTENT_BASE}/specs`,
  knowledge: `${CONTENT_BASE}/knowledge`,
  templates: `${CONTENT_BASE}/templates`,
};

/** .aidd/ state subdirectory paths (relative to .aidd/) */
export const STATE_PATHS = {
  CONFIG: 'config.json',
  MEMORY: 'memory',
  SESSIONS: 'sessions',
  SESSIONS_ACTIVE: 'sessions/active',
  SESSIONS_COMPLETED: 'sessions/completed',
  DRAFTS: 'drafts',
  EVOLUTION: 'evolution',
  BRANCHES: 'branches',
  ANALYTICS: 'analytics',
  CACHE: 'cache',
} as const;

/** Memory JSON file names (inside .aidd/memory/) */
export const MEMORY_FILES = {
  DECISIONS: 'decisions.json',
  MISTAKES: 'mistakes.json',
  CONVENTIONS: 'conventions.json',
} as const;

/** Build an absolute .aidd/ state path from project root */
export function statePath(root: string, subpath: string): string {
  return `${normalizePath(root)}/${AIDD_DIR}/${subpath}`;
}

/** Build an absolute content directory path from project root */
export function contentDir(root: string, category: ContentCategory): string {
  return `${normalizePath(root)}/${CONTENT_PATHS[category]}`;
}

/** File watcher prefixes — derived from categories + state paths */
export const WATCHER_PREFIXES = [
  ...ENTITY_CATEGORIES.map((c) => `/${AIDD_DIR}/${CONTENT_PATHS[c]}/`),
  `/${AIDD_DIR}/${STATE_PATHS.SESSIONS}/`,
  `/${AIDD_DIR}/${STATE_PATHS.EVOLUTION}/`,
  `/${AIDD_DIR}/${STATE_PATHS.DRAFTS}/`,
  `/${AIDD_DIR}/${STATE_PATHS.MEMORY}/`,
  `/${AIDD_DIR}/${STATE_PATHS.CONFIG}`,
  `/${AIDD_DIR}/data.db`,
] as const;

/** Marker keys for project detection display */
export const MARKER_KEYS: Array<{ key: string; label: string }> = [
  ...CONTENT_CATEGORIES.map((c) => ({
    key: c,
    label: c.charAt(0).toUpperCase() + c.slice(1),
  })),
  { key: 'aidd_dir', label: '.aidd/' },
  { key: 'memory', label: 'Memory' },
];

// ---------------------------------------------------------------------------
// Routes & Polling
// ---------------------------------------------------------------------------

export const ROUTES = {
  DASHBOARD: '/',
  PROJECTS: '/projects',
  AGENTS: '/agents',
  AGENT_DETAIL: '/agents/:name',
  // Framework — unified view at /framework/:category
  FRAMEWORK: '/framework',
  FRAMEWORK_RULES: '/framework/rules',
  FRAMEWORK_SKILLS: '/framework/skills',
  FRAMEWORK_KNOWLEDGE: '/framework/knowledge',
  FRAMEWORK_WORKFLOWS: '/framework/workflows',
  FRAMEWORK_TEMPLATES: '/framework/templates',
  FRAMEWORK_SPEC: '/framework/specs',
  // Legacy detail routes (kept for deep linking)
  RULES: '/rules',
  RULE_EDITOR: '/rules/:name',
  SKILLS: '/skills',
  SKILL_DETAIL: '/skills/:name',
  SKILL_EDITOR: '/skills/:name/edit',
  WORKFLOWS: '/workflows',
  WORKFLOW_DETAIL: '/workflows/:name',
  ORCHESTRATOR_DETAIL: '/workflows/:name',
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
  MARKETPLACE: '/marketplace',
  MARKETPLACE_DETAIL: '/marketplace/:type/:slug',
  MCP: '/mcp',
  MCP_HEALTH: '/mcp-health',
  MCP_SERVERS: '/mcp-servers',
  MCP_PLAYGROUND: '/mcp-playground',
  CONFIG: '/config',
  INTEGRATIONS: '/integrations',
  OVERRIDES: '/overrides',
  ARTIFACTS: '/artifacts',
  ARTIFACT_DETAIL: '/artifacts/:id',
  ADAPTERS: '/adapters',
  HELP: '/help',
} as const;

export const POLLING_INTERVALS = {
  MCP_HEALTH: 5000,
  OBSERVATIONS: 10000,
} as const;

export const FILE_WATCHER_DEBOUNCE_MS = 100;
