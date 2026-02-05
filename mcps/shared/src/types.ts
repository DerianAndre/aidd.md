import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodRawShape } from 'zod';
import type { ContentLoader } from './content-loader.js';
import type { Logger } from './logger.js';

// ---------------------------------------------------------------------------
// Module System
// ---------------------------------------------------------------------------

/** Context passed to every module during registration and lifecycle. */
export interface ModuleContext {
  readonly contentLoader: ContentLoader;
  readonly projectInfo: ProjectInfo;
  readonly config: AiddConfig;
  readonly logger: Logger;
  readonly projectRoot: string;
  readonly aiddDir: string;
}

/** Module interface — every AIDD module implements this. */
export interface AiddModule {
  readonly name: string;
  readonly description: string;
  register(server: McpServer, context: ModuleContext): void;
  onReady?(context: ModuleContext): Promise<void>;
}

// ---------------------------------------------------------------------------
// Tool Definition
// ---------------------------------------------------------------------------

/** Result returned by tool handlers, compatible with MCP SDK CallToolResult. */
export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export type ToolHandler<T = Record<string, unknown>> = (
  args: T,
) => Promise<ToolResult>;

export interface ToolDefinition {
  name: string;
  description: string;
  schema: ZodRawShape;
  annotations?: ToolAnnotations;
  handler: ToolHandler;
}

export interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

// ---------------------------------------------------------------------------
// Project Detection
// ---------------------------------------------------------------------------

export interface ProjectInfo {
  /** Whether AIDD framework files were detected in the project. */
  detected: boolean;
  /** Absolute path to the project root. */
  root: string;
  /** Where AIDD files live (root or ai/ subfolder). */
  aiddRoot: string;
  /** Detected framework files. */
  markers: {
    agentsMd: boolean;
    rules: boolean;
    skills: boolean;
    workflows: boolean;
    spec: boolean;
    knowledge: boolean;
    templates: boolean;
    aiddDir: boolean;
    memory: boolean;
  };
  /** Parsed package.json stack info. */
  stack: StackInfo;
}

export interface StackInfo {
  name?: string;
  version?: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface AiddConfig {
  evolution: {
    enabled: boolean;
    autoApplyThreshold: number;
    draftThreshold: number;
    learningPeriodSessions: number;
    killSwitch: boolean;
  };
  memory: {
    maxSessionHistory: number;
    autoPromoteBranchDecisions: boolean;
    pruneAfterDays: number;
  };
  modelTracking: {
    enabled: boolean;
    crossProject: boolean;
  };
  ci: {
    blockOn: string[];
    warnOn: string[];
    ignore: string[];
  };
  content: {
    overrideMode: 'merge' | 'project_only' | 'bundled_only';
  };
}

export const DEFAULT_CONFIG: AiddConfig = {
  evolution: {
    enabled: true,
    autoApplyThreshold: 90,
    draftThreshold: 70,
    learningPeriodSessions: 5,
    killSwitch: false,
  },
  memory: {
    maxSessionHistory: 100,
    autoPromoteBranchDecisions: true,
    pruneAfterDays: 90,
  },
  modelTracking: {
    enabled: true,
    crossProject: false,
  },
  ci: {
    blockOn: ['security_critical', 'type_safety'],
    warnOn: ['code_style', 'documentation'],
    ignore: ['commit_format'],
  },
  content: {
    overrideMode: 'merge',
  },
};

// ---------------------------------------------------------------------------
// Session State (Memory Layer 1)
// ---------------------------------------------------------------------------

export interface AiProvider {
  provider: string;
  model: string;
  modelId: string;
  client: string;
  modelTier?: string;
}

export interface SessionState {
  id: string;
  memorySessionId?: string;
  parentSessionId?: string;
  branch: string;
  startedAt: string;
  endedAt?: string;
  aiProvider: AiProvider;
  decisions: Array<{ decision: string; reasoning: string; timestamp: string }>;
  errorsResolved: Array<{ error: string; fix: string; timestamp: string }>;
  filesModified: string[];
  tasksCompleted: string[];
  tasksPending: string[];
  agentsUsed: string[];
  skillsUsed: string[];
  toolsCalled: Array<{ name: string; resultQuality: 'good' | 'neutral' | 'bad' }>;
  rulesApplied: string[];
  workflowsFollowed: string[];
  tkbEntriesConsulted: string[];
  taskClassification: { domain: string; nature: string; complexity: string };
  outcome?: SessionOutcome;
  lifecycleSessionId?: string;
}

export interface SessionOutcome {
  testsPassing: boolean;
  complianceScore: number;
  reverts: number;
  reworks: number;
  userFeedback?: 'positive' | 'neutral' | 'negative';
}

// ---------------------------------------------------------------------------
// Branch Context (Memory Layer 2)
// ---------------------------------------------------------------------------

export interface BranchContext {
  branch: string;
  feature?: string;
  phase?: string;
  spec?: string;
  plan?: string;
  completedTasks: string[];
  pendingTasks: string[];
  decisions: Array<{ decision: string; reasoning: string; sessionId: string }>;
  errorsEncountered: Array<{ error: string; fix: string; sessionId: string }>;
  filesModified: string[];
  sessionsCount: number;
  totalDurationMs: number;
  lifecycleSessionId?: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Memory Search (3-Layer Pattern)
// ---------------------------------------------------------------------------

/** Observation type discriminated union — covers existing + extensible types. */
export type ObservationType =
  | 'decision'
  | 'mistake'
  | 'convention'
  | 'pattern'
  | 'preference'
  | 'insight'
  | 'tool_outcome'
  | 'workflow_outcome';

/** Compact search result (~50-100 tokens). Layer 1 of 3-layer search. */
export interface MemoryIndexEntry {
  id: string;
  type: ObservationType;
  title: string;
  snippet: string;
  createdAt: string;
  sessionId?: string;
  relevanceScore?: number;
}

/** Timeline context around an anchor entry. Layer 2 of 3-layer search. */
export interface MemoryTimelineEntry {
  anchor: MemoryIndexEntry;
  before: MemoryIndexEntry[];
  after: MemoryIndexEntry[];
}

/** Full memory entry returned by batch get. Layer 3 of 3-layer search. */
export interface MemoryEntry {
  id: string;
  type: ObservationType;
  title: string;
  content: string;
  facts?: string[];
  narrative?: string;
  concepts?: string[];
  filesRead?: string[];
  filesModified?: string[];
  discoveryTokens?: number;
  createdAt: string;
  sessionId?: string;
}

// ---------------------------------------------------------------------------
// Session Observations
// ---------------------------------------------------------------------------

/** Generic typed observation captured during sessions. */
export interface SessionObservation {
  id: string;
  sessionId: string;
  type: ObservationType;
  title: string;
  facts?: string[];
  narrative?: string;
  concepts?: string[];
  filesRead?: string[];
  filesModified?: string[];
  discoveryTokens?: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Context Budget
// ---------------------------------------------------------------------------

/** Token allocation for context injection via aidd_optimize_context. */
export interface ContextBudget {
  totalTokens: number;
  headerTokens: number;
  memoryTokens: number;
  sessionTokens: number;
  suggestionTokens: number;
  reserveTokens: number;
}

export const DEFAULT_CONTEXT_BUDGET: ContextBudget = {
  totalTokens: 4000,
  headerTokens: 200,
  memoryTokens: 1500,
  sessionTokens: 500,
  suggestionTokens: 300,
  reserveTokens: 500,
};

// ---------------------------------------------------------------------------
// Storage Backend
// ---------------------------------------------------------------------------

/** Filter options for memory search. */
export interface SearchOptions {
  type?: ObservationType | ObservationType[];
  project?: string;
  dateStart?: string;
  dateEnd?: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'relevance' | 'date_asc' | 'date_desc';
}

/** Filter options for session listing. */
export interface SessionFilter {
  branch?: string;
  status?: 'active' | 'completed';
  memorySessionId?: string;
  limit?: number;
  offset?: number;
}

/** Analytics query parameters. */
export interface AnalyticsQuery {
  metric: 'tool_usage' | 'rule_violations' | 'tkb_queries' | 'model_performance';
  dateStart?: string;
  dateEnd?: string;
  groupBy?: 'day' | 'week' | 'month';
  limit?: number;
}

/** Analytics result entry. */
export interface AnalyticsResult {
  metric: string;
  entries: Array<{
    key: string;
    count: number;
    metadata?: Record<string, unknown>;
  }>;
  total: number;
}

/** Tool usage tracking entry. */
export interface ToolUsageEntry {
  toolName: string;
  sessionId: string;
  resultQuality: 'good' | 'neutral' | 'bad';
  durationMs?: number;
  timestamp: string;
}

/** Abstract storage backend — implementations for JSON and SQLite. */
export interface StorageBackend {
  readonly name: string;

  // Lifecycle
  initialize(): Promise<void>;
  close(): Promise<void>;

  // Sessions
  saveSession(session: SessionState): Promise<void>;
  getSession(id: string): Promise<SessionState | null>;
  listSessions(filter?: SessionFilter): Promise<MemoryIndexEntry[]>;

  // Observations
  saveObservation(observation: SessionObservation): Promise<void>;
  getObservation(id: string): Promise<SessionObservation | null>;

  // Search (3-layer)
  search(query: string, options?: SearchOptions): Promise<MemoryIndexEntry[]>;
  getTimeline(anchorId: string, depth?: number): Promise<MemoryTimelineEntry>;
  getByIds(ids: string[]): Promise<MemoryEntry[]>;

  // Analytics
  recordToolUsage(entry: ToolUsageEntry): Promise<void>;
  getAnalytics(query: AnalyticsQuery): Promise<AnalyticsResult>;
}

// ---------------------------------------------------------------------------
// Server Options
// ---------------------------------------------------------------------------

export interface AiddServerOptions {
  name: string;
  version: string;
  modules: AiddModule[];
  projectPath?: string;
}
