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
  /**
   * Cross-module service registry.
   * Modules register callable services during `register()`.
   * Other modules invoke them later in tool handlers.
   * The `readonly` prevents reassigning the object, but allows adding keys.
   */
  readonly services: Record<string, (...args: unknown[]) => Promise<unknown>>;
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
  /** Where AIDD files live (.aidd/ directory). */
  aiddRoot: string;
  /** Detected framework files. */
  markers: {
    agents: boolean;
    rules: boolean;
    skills: boolean;
    workflows: boolean;
    specs: boolean;
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
    slimStartEnabled?: boolean;
    slimStartTargetTokens?: number;
    paths?: ContentPaths;
  };
}

/** Custom content paths — all relative to project root. */
export interface ContentPaths {
  /** Override the base content directory (default: "content"). */
  content?: string;
  /** Override AGENTS.md location (default: "AGENTS.md"). */
  agents?: string;
  /** Override rules directory (default: "content/rules"). */
  rules?: string;
  /** Override skills directory (default: "content/skills"). */
  skills?: string;
  /** Override workflows directory (default: "content/workflows"). */
  workflows?: string;
  /** Override specs directory (default: "content/specs"). */
  specs?: string;
  /** Override knowledge directory (default: "content/knowledge"). */
  knowledge?: string;
  /** Override templates directory (default: "content/templates"). */
  templates?: string;
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
    slimStartEnabled: true,
    slimStartTargetTokens: 600,
  },
};

// ---------------------------------------------------------------------------
// Model Routing Matrix
// ---------------------------------------------------------------------------

export type ModelTier = 1 | 2 | 3;

export type ModelStatus = 'active' | 'deprecated' | 'preview';

export interface ModelEntry {
  id: string;
  provider: string;
  name: string;
  tier: ModelTier;
  cognitiveProfile: string[];
  contextWindow: number;
  /** Cost indicator: '$' = budget (<$2/1M out), '$$' = standard ($2-$15/1M out), '$$$' = premium (>$15/1M out) */
  costTier: '$' | '$$' | '$$$';
  status: ModelStatus;
  deprecationDate?: string;
  selfHosted?: boolean;
}

export interface ModelRoutingResult {
  tier: ModelTier;
  recommended: ModelEntry;
  alternatives: ModelEntry[];
  fallbackChain: string[];
}

// ---------------------------------------------------------------------------
// Token Tracking
// ---------------------------------------------------------------------------

/** Token usage reported by the client (opt-in). */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  totalCost?: number;
}

/** Statistical fingerprint — computed server-side at zero token cost. */
export interface ModelFingerprint {
  avgSentenceLength: number;
  sentenceLengthVariance: number;
  typeTokenRatio: number;
  avgParagraphLength: number;
  passiveVoiceRatio: number;
  fillerDensity: number;
  questionFrequency: number;
}

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
  /** Human-friendly session label (distinct from input prompt) */
  name?: string;
  memorySessionId?: string;
  parentSessionId?: string;
  branch: string;
  startedAt: string;
  endedAt?: string;
  /** Unix timestamp in milliseconds from DB column projection (Hub bridge). */
  startedAtTs?: number;
  /** Unix timestamp in milliseconds from DB column projection (Hub bridge). */
  endedAtTs?: number;
  aiProvider: AiProvider;
  /** The user's initial request / prompt that started this session */
  input?: string;
  /** Summary of work produced during the session */
  output?: string;
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
  taskClassification: {
    domain: string;
    nature: string;
    complexity: string;
    phase?: string;
    tier?: number;
    fastTrack?: boolean;
    risky?: boolean;
    skippableStages?: string[];
  };
  outcome?: SessionOutcome;
  lifecycleSessionId?: string;
  tokenUsage?: TokenUsage;
  tokenTelemetrySource?: 'reported' | 'estimated';
  fingerprint?: ModelFingerprint;
  timingMetrics?: {
    startupMs?: number;
    governanceOverheadMs?: number;
  };
}

export interface SessionOutcome {
  testsPassing: boolean;
  complianceScore: number;
  reverts: number;
  reworks: number;
  userFeedback?: 'positive' | 'neutral' | 'negative';
  contextEfficiency?: number;
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
// Evolution Engine
// ---------------------------------------------------------------------------

export type EvolutionType =
  | 'routing_weight'
  | 'skill_combo'
  | 'rule_elevation'
  | 'compound_workflow'
  | 'tkb_promotion'
  | 'new_convention'
  | 'model_recommendation'
  | 'model_pattern_ban'
  | 'context_efficiency';

export interface EvolutionCandidate {
  id: string;
  type: EvolutionType;
  title: string;
  description: string;
  confidence: number;
  sessionCount: number;
  evidence: string[];
  discoveryTokensTotal: number;
  suggestedAction: string;
  modelScope?: string;
  modelEvidence?: Record<string, number>;
  shadowTested?: boolean;
  falsePositiveRate?: number;
  sampleSize?: number;
  testedAt?: string;
  status?: 'pending' | 'auto_applied' | 'drafted' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface EvolutionLogEntry {
  id: string;
  candidateId: string;
  action: 'auto_applied' | 'drafted' | 'pending' | 'reverted' | 'rejected' | 'approved';
  title: string;
  confidence: number;
  snapshot?: string;
  timestamp: string;
}

export interface EvolutionSnapshot {
  id: string;
  candidateId: string;
  beforeState: Record<string, string>;
  appliedAt: string;
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

export interface DraftEntry {
  id: string;
  category: string;
  title: string;
  filename: string;
  content: string;
  confidence: number;
  source: 'evolution' | 'manual';
  evolutionCandidateId?: string;
  status: 'pending' | 'approved' | 'rejected';
  data?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedReason?: string;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export type AiddPhase =
  | 'UNDERSTAND'
  | 'PLAN'
  | 'SPEC'
  | 'BUILD'
  | 'VERIFY'
  | 'SHIP';

export interface LifecyclePhaseRecord {
  name: AiddPhase;
  enteredAt: string;
  exitedAt?: string;
  notes?: string;
}

export interface LifecycleSession {
  id: string;
  sessionId?: string;
  feature: string;
  currentPhase: AiddPhase;
  status: 'active' | 'completed' | 'abandoned';
  phases: LifecyclePhaseRecord[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

export const ARTIFACT_TYPES = [
  'plan', 'brainstorm', 'research', 'adr', 'diagram',
  'issue', 'spec', 'checklist', 'retro',
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];
export type ArtifactStatus = 'active' | 'done';

export interface ArtifactEntry {
  id: string;
  sessionId?: string;
  type: ArtifactType;
  feature: string;
  status: ArtifactStatus;
  title: string;
  description: string;
  content: string;
  date: string | number;
  createdAt: string | number;
  updatedAt: string | number;
}

export interface ArtifactFilter {
  type?: string;
  status?: string;
  feature?: string;
  sessionId?: string;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Permanent Memory
// ---------------------------------------------------------------------------

export interface PermanentMemoryEntry {
  id: string;
  type: ObservationType;
  title: string;
  content: string;
  createdAt: string;
  sessionId?: string;
}

// ---------------------------------------------------------------------------
// Pattern Killer
// ---------------------------------------------------------------------------

export interface BannedPattern {
  id: string;
  category: 'filler' | 'hedge' | 'structure' | 'verbosity' | 'compliance';
  pattern: string;
  type: 'exact' | 'regex';
  severity: 'critical' | 'high' | 'medium' | 'low';
  modelScope?: string;
  hint?: string;
  origin: 'system' | 'learned';
  active: boolean;
  useCount: number;
  lastSeen?: string;
  createdAt: string;
}

export interface PatternDetection {
  id?: number;
  sessionId?: string;
  modelId: string;
  patternId?: string;
  matchedText: string;
  context?: string;
  source: 'ai_output' | 'user_input' | 'auto' | 'false_positive';
  createdAt: string;
}

export interface AuditScore {
  id?: number;
  sessionId?: string;
  modelId: string;
  inputHash: string;
  totalScore: number;
  dimensions: {
    lexicalDiversity: number;
    structuralVariation: number;
    voiceAuthenticity: number;
    patternAbsence: number;
    semanticPreservation: number;
    tidBonus?: number;
    guardrailPenalty?: number;
  };
  patternsFound: number;
  verdict: 'pass' | 'retry' | 'escalate';
  createdAt: string;
}

export interface PatternStats {
  totalDetections: number;
  models: Array<{
    modelId: string;
    detections: number;
    summary: string;
  }>;
  topPatterns: Array<{
    pattern: string;
    category: string;
    count: number;
    uniqueSessions: number;
  }>;
}

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

/** Filter for evolution candidates. */
export interface EvolutionCandidateFilter {
  type?: EvolutionType;
  title?: string;
  status?: string;
  modelScope?: string;
  minConfidence?: number;
}

/** Filter for evolution log. */
export interface EvolutionLogFilter {
  candidateId?: string;
  limit?: number;
}

/** Filter for banned patterns. */
export interface BannedPatternFilter {
  active?: boolean;
  modelScope?: string;
  category?: string;
}

/** Filter for pattern stats. */
export interface PatternStatsFilter {
  modelId?: string;
}

/** Filter for drafts. */
export interface DraftFilter {
  category?: string;
  status?: string;
  limit?: number;
}

/** Filter for lifecycle sessions. */
export interface LifecycleFilter {
  status?: string;
  limit?: number;
}

/** Filter for permanent memory. */
export interface PermanentMemoryFilter {
  type?: ObservationType;
  limit?: number;
}

/** Options for data pruning. */
export interface PruneOptions {
  patternDetectionMaxAgeDays?: number;
  maxObservations?: number;
  maxSessionsIndexed?: number;
}

/** Abstract storage backend — SQLite-only implementation. */
export interface StorageBackend {
  readonly name: string;

  // Lifecycle
  initialize(): Promise<void>;
  close(): Promise<void>;
  checkpoint(): void;
  pruneStaleData(options?: PruneOptions): void;

  // Sessions
  saveSession(session: SessionState): Promise<void>;
  getSession(id: string): Promise<SessionState | null>;
  listSessions(filter?: SessionFilter): Promise<MemoryIndexEntry[]>;
  deleteSession(id: string): Promise<void>;

  // Observations
  saveObservation(observation: SessionObservation): Promise<void>;
  getObservation(id: string): Promise<SessionObservation | null>;
  listObservations(filter?: { sessionId?: string; limit?: number }): Promise<SessionObservation[]>;

  // Search (3-layer)
  search(query: string, options?: SearchOptions): Promise<MemoryIndexEntry[]>;
  getTimeline(anchorId: string, depth?: number): Promise<MemoryTimelineEntry>;
  getByIds(ids: string[]): Promise<MemoryEntry[]>;

  // Analytics
  recordToolUsage(entry: ToolUsageEntry): Promise<void>;
  getAnalytics(query: AnalyticsQuery): Promise<AnalyticsResult>;

  // Branches
  saveBranch(branch: BranchContext): Promise<void>;
  getBranch(name: string): Promise<BranchContext | null>;
  listBranches(filter?: { archived?: boolean }): Promise<BranchContext[]>;
  archiveBranch(name: string): Promise<void>;

  // Evolution
  saveEvolutionCandidate(candidate: EvolutionCandidate): Promise<void>;
  listEvolutionCandidates(filter?: EvolutionCandidateFilter): Promise<EvolutionCandidate[]>;
  updateEvolutionCandidate(candidate: EvolutionCandidate): Promise<void>;
  deleteEvolutionCandidate(id: string): Promise<void>;
  appendEvolutionLog(entry: EvolutionLogEntry): Promise<void>;
  getEvolutionLog(filter?: EvolutionLogFilter): Promise<EvolutionLogEntry[]>;
  saveEvolutionSnapshot(snapshot: EvolutionSnapshot): Promise<void>;
  getEvolutionSnapshot(id: string): Promise<EvolutionSnapshot | null>;

  // Drafts
  saveDraft(draft: DraftEntry): Promise<void>;
  getDraft(id: string): Promise<DraftEntry | null>;
  listDrafts(filter?: DraftFilter): Promise<DraftEntry[]>;
  updateDraft(draft: DraftEntry): Promise<void>;
  deleteDraft(id: string): Promise<void>;

  // Lifecycle
  saveLifecycle(session: LifecycleSession): Promise<void>;
  getLifecycle(id: string): Promise<LifecycleSession | null>;
  listLifecycles(filter?: LifecycleFilter): Promise<LifecycleSession[]>;

  // Permanent memory
  savePermanentMemory(entry: PermanentMemoryEntry): Promise<void>;
  getPermanentMemory(id: string): Promise<PermanentMemoryEntry | null>;
  listPermanentMemory(filter?: PermanentMemoryFilter): Promise<PermanentMemoryEntry[]>;
  deletePermanentMemory(id: string): Promise<void>;

  // Artifacts
  saveArtifact(artifact: ArtifactEntry): Promise<void>;
  getArtifact(id: string): Promise<ArtifactEntry | null>;
  listArtifacts(filter?: ArtifactFilter): Promise<ArtifactEntry[]>;
  deleteArtifact(id: string): Promise<boolean>;

  // Patterns
  saveBannedPattern(pattern: BannedPattern): Promise<void>;
  listBannedPatterns(filter?: BannedPatternFilter): Promise<BannedPattern[]>;
  updateBannedPattern(pattern: BannedPattern): Promise<void>;
  recordPatternDetection(detection: PatternDetection): Promise<void>;
  getPatternStats(filter: PatternStatsFilter): Promise<PatternStats>;
  saveAuditScore(score: AuditScore): Promise<void>;
  listAuditScores(filter?: { sessionId?: string; modelId?: string; limit?: number }): Promise<AuditScore[]>;
}

// ---------------------------------------------------------------------------
// Server Options
// ---------------------------------------------------------------------------

export interface AiddServerOptions {
  name: string;
  version: string;
  instructions?: string;
  modules: AiddModule[];
  projectPath?: string;
}
