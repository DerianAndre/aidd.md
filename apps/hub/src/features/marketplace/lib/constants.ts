// ---------------------------------------------------------------------------
// Marketplace constants
// ---------------------------------------------------------------------------

import type { McpCategory, ContentType, SortOption, MarketplaceFilters } from './types';

// ── Registry URLs ───────────────────────────────────────────────

export const REGISTRY_BASE = 'https://raw.githubusercontent.com/aidd-md/registry/main';
export const MCP_REGISTRY_URL = `${REGISTRY_BASE}/mcp-servers.json`;
export const CONTENT_REGISTRY_URL = `${REGISTRY_BASE}/content.json`;

// ── MCP Categories ──────────────────────────────────────────────

export const MCP_CATEGORIES: { value: McpCategory; label: string }[] = [
  { value: 'ai-llm', label: 'AI / LLM' },
  { value: 'database', label: 'Database' },
  { value: 'browser', label: 'Browser' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'devtools', label: 'DevTools' },
  { value: 'communication', label: 'Communication' },
  { value: 'file-system', label: 'File System' },
  { value: 'search', label: 'Search' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];

// ── Content Types ───────────────────────────────────────────────

export const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'skill', label: 'Skills' },
  { value: 'workflow', label: 'Workflows' },
  { value: 'rule', label: 'Rules' },
  { value: 'template', label: 'Templates' },
  { value: 'knowledge', label: 'Knowledge' },
];

// ── Sort Options ────────────────────────────────────────────────

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
  { value: 'alphabetical', label: 'A-Z' },
];

// ── Compatibility Targets ───────────────────────────────────────

export const COMPATIBILITY_TARGETS: { value: string; label: string }[] = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'vscode', label: 'VS Code' },
  { value: 'windsurf', label: 'Windsurf' },
  { value: 'zed', label: 'Zed' },
];

// ── Install Targets ─────────────────────────────────────────────

export const INSTALL_TARGETS = [
  { id: 'claude-code', label: 'Claude Code', configPath: '~/.claude.json' },
  { id: 'cursor', label: 'Cursor', configPath: '.cursor/mcp.json' },
  { id: 'vscode', label: 'VS Code', configPath: '.vscode/settings.json' },
] as const;

// ── Default Filters ─────────────────────────────────────────────

export const DEFAULT_FILTERS: MarketplaceFilters = {
  tab: 'mcp-servers',
  search: '',
  sort: 'popular',
  viewMode: 'grid',
  mcpCategories: [],
  contentTypes: [],
  tags: [],
  onlyOfficial: false,
  onlyTrending: false,
};
