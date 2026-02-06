// ---------------------------------------------------------------------------
// Static MCP catalog — tool / resource / prompt definitions for all packages
// ---------------------------------------------------------------------------

export interface McpToolInfo {
  name: string;
  description: string;
  multiAction?: boolean;
  actions?: string[];
}

export interface McpResourceInfo {
  uri: string;
  description: string;
}

export interface McpPromptInfo {
  name: string;
  description: string;
}

export interface McpPackageInfo {
  name: string;
  dir: string;
  /** Parent directory: 'mcps' for MCP servers, 'packages' for support libs */
  location: 'mcps' | 'packages';
  description: string;
  role: string;
  /** Whether this package is a runnable MCP server */
  isServer: boolean;
  tools: McpToolInfo[];
  resources: McpResourceInfo[];
  prompts: McpPromptInfo[];
}

// ---------------------------------------------------------------------------
// Package definitions
// ---------------------------------------------------------------------------

export const MCP_PACKAGES: McpPackageInfo[] = [
  // ── Shared (support library — NOT an MCP server) ─────────────────────────
  {
    name: '@aidd.md/mcp-shared',
    dir: 'shared',
    location: 'packages',
    description: 'Types, utilities, and server factory shared across all MCP packages',
    role: 'Foundation',
    isServer: false,
    tools: [],
    resources: [],
    prompts: [],
  },

  // ── Core — "The Brain" ─────────────────────────────────────────────────
  {
    name: '@aidd.md/mcp-core',
    dir: 'mcp-aidd-core',
    location: 'mcps',
    description: 'Guidance, routing, knowledge — the decision-making brain',
    role: 'The Brain',
    isServer: true,
    tools: [
      // bootstrap
      { name: 'aidd_detect_project', description: 'Scan for AIDD framework markers and parse package.json for stack detection' },
      { name: 'aidd_get_config', description: 'Return active AIDD MCP configuration' },
      { name: 'aidd_bootstrap', description: 'One-call conversation starter: project detection, agents, rules, next steps' },
      // context
      { name: 'aidd_optimize_context', description: 'Generate optimized context block within token budget' },
      // guidance
      { name: 'aidd_apply_heuristics', description: 'Run a decision through 10 operating heuristics' },
      { name: 'aidd_suggest_next', description: 'Context-aware suggestions for next action' },
      { name: 'aidd_tech_compatibility', description: 'Analyze compatibility between technologies via TKB' },
      // knowledge
      { name: 'aidd_query_tkb', description: 'Search and filter the Technology Knowledge Base' },
      { name: 'aidd_get_tkb_entry', description: 'Get full TKB entry by name' },
      { name: 'aidd_get_agent', description: 'Get agent SKILL.md with parsed frontmatter' },
      { name: 'aidd_get_competency_matrix', description: 'Cross-agent competency matrix' },
      // routing
      { name: 'aidd_classify_task', description: 'Classify task into agents, workflows, templates' },
      { name: 'aidd_get_routing_table', description: 'Full AIDD routing table' },
      // scaffold
      { name: 'aidd_scaffold', description: 'Initialize AIDD framework in a project' },
    ],
    resources: [
      { uri: 'aidd://agents', description: 'AGENTS.md — Single Source of Truth for agent roles' },
      { uri: 'aidd://knowledge/{name}', description: 'Technology Knowledge Base entries' },
      { uri: 'aidd://skills/{name}', description: 'Agent skill definitions (SKILL.md)' },
      { uri: 'aidd://spec/heuristics', description: 'AIDD operating heuristics (10 decision principles)' },
    ],
    prompts: [
      { name: 'aidd_plan_task', description: 'Plan using BLUF-6 format' },
      { name: 'aidd_review_code', description: 'Review code against active AIDD rules' },
      { name: 'aidd_start_feature', description: 'Guide ASDD lifecycle for a new feature' },
    ],
  },

  // ── Memory — "The Memory" ──────────────────────────────────────────────
  {
    name: '@aidd.md/mcp-memory',
    dir: 'mcp-aidd-memory',
    location: 'mcps',
    description: 'Persistence, sessions, evolution, analytics — the long-term memory',
    role: 'The Memory',
    isServer: true,
    tools: [
      // session
      { name: 'aidd_session', description: 'Manage development sessions', multiAction: true, actions: ['start', 'update', 'end', 'get', 'list'] },
      // branch
      { name: 'aidd_branch', description: 'Manage branch context', multiAction: true, actions: ['get', 'save', 'promote', 'list', 'merge'] },
      // memory
      { name: 'aidd_memory_search', description: 'Search memory (3-layer: compact index)' },
      { name: 'aidd_memory_context', description: 'Get timeline context around a memory entry' },
      { name: 'aidd_memory_get', description: 'Get full details for entries by ID' },
      { name: 'aidd_memory_add_decision', description: 'Record permanent decision' },
      { name: 'aidd_memory_add_mistake', description: 'Record mistake with fix' },
      { name: 'aidd_memory_add_convention', description: 'Record project convention' },
      { name: 'aidd_memory_prune', description: 'Remove permanent memory entry' },
      // observation
      { name: 'aidd_observation', description: 'Record typed observation during session' },
      // lifecycle
      { name: 'aidd_lifecycle_get', description: '8-phase ASDD lifecycle definition' },
      { name: 'aidd_lifecycle_init', description: 'Start new ASDD lifecycle session' },
      { name: 'aidd_lifecycle_advance', description: 'Advance lifecycle to next phase' },
      { name: 'aidd_lifecycle_status', description: 'Current lifecycle session status' },
      { name: 'aidd_lifecycle_list', description: 'List ASDD lifecycle sessions' },
      // analytics
      { name: 'aidd_model_performance', description: 'AI model performance metrics from sessions' },
      { name: 'aidd_model_compare', description: 'Side-by-side model comparison' },
      { name: 'aidd_model_recommend', description: 'Recommend best model for task type' },
      // evolution
      { name: 'aidd_evolution_analyze', description: 'Analyze sessions for evolution candidates' },
      { name: 'aidd_evolution_status', description: 'Evolution engine status + pending candidates' },
      { name: 'aidd_evolution_review', description: 'Review specific evolution candidate' },
      { name: 'aidd_evolution_revert', description: 'Revert auto-applied evolution change' },
      // drafts
      { name: 'aidd_draft_create', description: 'Create content draft awaiting approval' },
      { name: 'aidd_draft_list', description: 'List content drafts with confidence' },
      { name: 'aidd_draft_approve', description: 'Approve and promote draft to project' },
      // diagnostics
      { name: 'aidd_diagnose_error', description: 'Search memory for similar past mistakes' },
      { name: 'aidd_project_health', description: 'Calculate project health score from analytics' },
    ],
    resources: [],
    prompts: [],
  },

  // ── Tools — "The Hands" ────────────────────────────────────────────────
  {
    name: '@aidd.md/mcp-tools',
    dir: 'mcp-aidd-tools',
    location: 'mcps',
    description: 'Validation, enforcement, CI/CD — the execution layer (Phase 6-10)',
    role: 'The Hands',
    isServer: true,
    tools: [],
    resources: [],
    prompts: [],
  },

  // ── Monolithic ─────────────────────────────────────────────────────────
  {
    name: '@aidd.md/mcp',
    dir: 'mcp-aidd',
    location: 'mcps',
    description: 'All tools in one process — convenience package for single-server setups',
    role: 'Monolithic',
    isServer: true,
    tools: [], // aggregates core + memory + tools at runtime
    resources: [],
    prompts: [],
  },
];

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

/** Only MCP server packages (excludes support libs like shared) */
export const MCP_SERVERS = MCP_PACKAGES.filter((p) => p.isServer);

/** All tools across all packages (excluding monolithic aggregate) */
export function getAllTools(): (McpToolInfo & { packageName: string })[] {
  return MCP_PACKAGES.flatMap((pkg) =>
    pkg.tools.map((t) => ({ ...t, packageName: pkg.name })),
  );
}

/** All resources across all packages */
export function getAllResources(): (McpResourceInfo & { packageName: string })[] {
  return MCP_PACKAGES.flatMap((pkg) =>
    pkg.resources.map((r) => ({ ...r, packageName: pkg.name })),
  );
}

/** All prompts across all packages */
export function getAllPrompts(): (McpPromptInfo & { packageName: string })[] {
  return MCP_PACKAGES.flatMap((pkg) =>
    pkg.prompts.map((p) => ({ ...p, packageName: pkg.name })),
  );
}

/** Total counts */
export function getCatalogStats() {
  const tools = getAllTools();
  const resources = getAllResources();
  const prompts = getAllPrompts();
  return {
    totalTools: tools.length,
    totalResources: resources.length,
    totalPrompts: prompts.length,
    totalPackages: MCP_PACKAGES.length,
    totalServers: MCP_SERVERS.length,
  };
}
