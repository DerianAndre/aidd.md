// ---------------------------------------------------------------------------
// Marketplace type definitions
// ---------------------------------------------------------------------------

// ── Tab & View ──────────────────────────────────────────────────

export type MarketplaceTab =
  | 'mcp-servers'
  | 'agents'
  | 'rules'
  | 'skills'
  | 'knowledge'
  | 'workflows'
  | 'templates'
  | 'spec';
export type ViewMode = 'grid' | 'list';
export type SortOption = 'popular' | 'trending' | 'newest' | 'alphabetical';

// ── Categories ──────────────────────────────────────────────────

export type McpCategory =
  | 'ai-llm'
  | 'database'
  | 'browser'
  | 'cloud'
  | 'devtools'
  | 'communication'
  | 'file-system'
  | 'search'
  | 'monitoring'
  | 'security'
  | 'other';

export type ContentType = 'agent' | 'skill' | 'workflow' | 'rule' | 'template' | 'knowledge' | 'spec';
export type TransportType = 'stdio' | 'sse' | 'http';

// ── MCP Server Entry ────────────────────────────────────────────

export interface McpServerEntry {
  type: 'mcp-server';
  slug: string;
  name: string;
  description: string;
  longDescription?: string;
  author: string;
  authorUrl?: string;
  githubUrl?: string;
  npmPackage?: string;
  category: McpCategory;
  tags: string[];
  transport: TransportType[];
  features: string[];
  installCount: number;
  trending: boolean;
  official: boolean;
  createdAt: string;
  updatedAt: string;
  configSnippet: Record<string, unknown>;
  compatibility: string[];
}

// ── Content Entry ───────────────────────────────────────────────

export interface ContentEntry {
  type: 'content';
  slug: string;
  name: string;
  description: string;
  longDescription?: string;
  author: string;
  authorUrl?: string;
  githubUrl?: string;
  contentType: ContentType;
  tags: string[];
  installCount: number;
  trending: boolean;
  official: boolean;
  createdAt: string;
  updatedAt: string;
  markdownContent: string;
  installCommand?: string;
  compatibility: string[];
}

// ── Union ───────────────────────────────────────────────────────

export type MarketplaceEntry = McpServerEntry | ContentEntry;

// ── Filter State ────────────────────────────────────────────────

export interface MarketplaceFilters {
  tab: MarketplaceTab;
  search: string;
  sort: SortOption;
  viewMode: ViewMode;
  mcpCategories: McpCategory[];
  tags: string[];
  onlyOfficial: boolean;
  onlyTrending: boolean;
}

// ── Stats ───────────────────────────────────────────────────────

export interface MarketplaceStats {
  totalMcpServers: number;
  totalContent: number;
  totalInstalls: number;
  categoryCounts: Record<string, number>;
}

// ── Registry ────────────────────────────────────────────────────

export interface RegistryResponse<T> {
  version: string;
  updatedAt: string;
  entries: T[];
}
