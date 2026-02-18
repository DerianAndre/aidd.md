// Server
export {
  createAiddServer,
  registerTool,
  startStdioServer,
  McpServer,
} from './server.js';

// Response helpers
export {
  createTextResult,
  createJsonResult,
  createErrorResult,
} from './response.js';

// Types
export type {
  AiddModule,
  AiddConfig,
  AiddPhase,
  AiddServerOptions,
  AiProvider,
  AnalyticsQuery,
  AnalyticsResult,
  ArtifactEntry,
  ArtifactFilter,
  ArtifactStatus,
  ArtifactType,
  AuditScore,
  BannedPattern,
  BannedPatternFilter,
  BranchContext,
  ContentPaths,
  ContextBudget,
  DraftEntry,
  DraftFilter,
  EvolutionCandidate,
  EvolutionCandidateFilter,
  EvolutionLogEntry,
  EvolutionLogFilter,
  EvolutionSnapshot,
  EvolutionType,
  HealthSnapshot,
  HealthSnapshotFilter,
  LifecycleFilter,
  LifecyclePhaseRecord,
  LifecycleSession,
  MemoryEntry,
  MemoryIndexEntry,
  MemoryTimelineEntry,
  ModelEntry,
  ModelFingerprint,
  ModelRoutingResult,
  ModelStatus,
  ModelTier,
  ModuleContext,
  ObservationType,
  PatternDetection,
  PatternStats,
  PatternStatsFilter,
  PermanentMemoryEntry,
  PermanentMemoryFilter,
  ProjectInfo,
  PruneOptions,
  SearchOptions,
  SessionFilter,
  SessionObservation,
  SessionOutcome,
  SessionState,
  StackInfo,
  StorageBackend,
  SystemDiagnostics,
  TokenUsage,
  ToolAnnotations,
  ToolDefinition,
  ToolHandler,
  ToolResult,
  ToolUsageEntry,
} from './types.js';
export { ARTIFACT_TYPES, DEFAULT_CONFIG, DEFAULT_CONTEXT_BUDGET } from './types.js';

// Content loader
export { ContentLoader } from './content-loader.js';
export type { ContentEntry, ContentIndex } from './content-loader.js';

// Project detection
export { detectProject } from './project-detector.js';

// Paths
export {
  findProjectRoot,
  fromRoot,
  detectAiddRoot,
  aiddPaths,
  statePaths,
} from './paths.js';

// File system utilities
export {
  readFileOrNull,
  readJsonFile,
  writeJsonFile,
  writeFileSafe,
  listFiles,
  listDirectories,
  isDirectory,
  getBaseName,
  ensureDir,
} from './fs.js';

// Logger
export { createLogger } from './logger.js';
export type { Logger, LogLevel } from './logger.js';

// Utilities
export {
  parseFrontmatter,
  extractTitle,
  generateId,
  now,
  deepMerge,
  stripPrivateTags,
  estimateTokens,
  truncateToTokens,
} from './utils.js';

// Markdown parsing
export {
  parseMarkdownTable,
  parseAllMarkdownTables,
  extractSection,
  extractSections,
} from './markdown.js';
export type { MarkdownTable } from './markdown.js';

// Schemas
export {
  aiProviderSchema,
  analyticsQuerySchema,
  contextBudgetSchema,
  memoryEntrySchema,
  memoryIndexEntrySchema,
  memoryTimelineEntrySchema,
  modelEntrySchema,
  modelRoutingResultSchema,
  modelStatusSchema,
  modelTierSchema,
  observationTypeSchema,
  searchOptionsSchema,
  sessionFilterSchema,
  sessionObservationSchema,
  sessionStateSchema,
  sessionOutcomeSchema,
  branchContextSchema,
  decisionEntrySchema,
  mistakeEntrySchema,
  conventionEntrySchema,
  toolUsageEntrySchema,
  aiddConfigSchema,
} from './schemas.js';
