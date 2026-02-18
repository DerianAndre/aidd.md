import { z } from 'zod';

// ---------------------------------------------------------------------------
// Model Routing Matrix
// ---------------------------------------------------------------------------

export const modelTierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const modelStatusSchema = z.enum(['active', 'deprecated', 'preview']);

export const modelEntrySchema = z.object({
  id: z.string(),
  provider: z.string(),
  name: z.string(),
  tier: modelTierSchema,
  cognitiveProfile: z.array(z.string()),
  contextWindow: z.number().int().min(0),
  costTier: z.enum(['$', '$$', '$$$']),
  status: modelStatusSchema,
  deprecationDate: z.string().optional(),
  selfHosted: z.boolean().optional(),
});

export const modelRoutingResultSchema = z.object({
  tier: modelTierSchema,
  recommended: modelEntrySchema,
  alternatives: z.array(modelEntrySchema),
  fallbackChain: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// AI Provider
// ---------------------------------------------------------------------------

export const aiProviderSchema = z.object({
  provider: z.string(),
  model: z.string(),
  modelId: z.string(),
  client: z.string(),
  modelTier: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Session State (Memory Layer 1)
// ---------------------------------------------------------------------------

export const sessionOutcomeSchema = z.object({
  testsPassing: z.boolean(),
  complianceScore: z.number().min(0).max(100),
  reverts: z.number().int().min(0),
  reworks: z.number().int().min(0),
  userFeedback: z.enum(['positive', 'neutral', 'negative']).optional(),
});

export const sessionStateSchema = z.object({
  id: z.string(),
  memorySessionId: z.string().optional(),
  parentSessionId: z.string().optional(),
  branch: z.string(),
  startedAt: z.string(),
  endedAt: z.string().optional(),
  startedAtTs: z.number().int().optional(),
  endedAtTs: z.number().int().optional(),
  aiProvider: aiProviderSchema,
  decisions: z.array(z.object({
    decision: z.string(),
    reasoning: z.string(),
    timestamp: z.string(),
  })),
  errorsResolved: z.array(z.object({
    error: z.string(),
    fix: z.string(),
    timestamp: z.string(),
  })),
  filesModified: z.array(z.string()),
  tasksCompleted: z.array(z.string()),
  tasksPending: z.array(z.string()),
  agentsUsed: z.array(z.string()),
  skillsUsed: z.array(z.string()),
  toolsCalled: z.array(z.object({
    name: z.string(),
    resultQuality: z.enum(['good', 'neutral', 'bad']),
  })),
  rulesApplied: z.array(z.string()),
  workflowsFollowed: z.array(z.string()),
  tkbEntriesConsulted: z.array(z.string()),
  taskClassification: z.object({
    domain: z.string(),
    nature: z.string(),
    complexity: z.string(),
    phase: z.string().optional(),
    tier: z.number().int().optional(),
    fastTrack: z.boolean().optional(),
    risky: z.boolean().optional(),
    skippableStages: z.array(z.string()).optional(),
  }),
  outcome: sessionOutcomeSchema.optional(),
  lifecycleSessionId: z.string().optional(),
  timingMetrics: z.object({
    startupMs: z.number().int().min(0).optional(),
    governanceOverheadMs: z.number().int().min(0).optional(),
  }).optional(),
});

// ---------------------------------------------------------------------------
// Branch Context (Memory Layer 2)
// ---------------------------------------------------------------------------

export const branchContextSchema = z.object({
  branch: z.string(),
  feature: z.string().optional(),
  phase: z.string().optional(),
  spec: z.string().optional(),
  plan: z.string().optional(),
  completedTasks: z.array(z.string()),
  pendingTasks: z.array(z.string()),
  decisions: z.array(z.object({
    decision: z.string(),
    reasoning: z.string(),
    sessionId: z.string(),
  })),
  errorsEncountered: z.array(z.object({
    error: z.string(),
    fix: z.string(),
    sessionId: z.string(),
  })),
  filesModified: z.array(z.string()),
  sessionsCount: z.number().int().min(0),
  totalDurationMs: z.number().min(0),
  lifecycleSessionId: z.string().optional(),
  updatedAt: z.string(),
});

// ---------------------------------------------------------------------------
// Memory Entries (Layer 4: Permanent)
// ---------------------------------------------------------------------------

export const decisionEntrySchema = z.object({
  id: z.string(),
  decision: z.string(),
  reasoning: z.string(),
  alternatives: z.array(z.string()).optional(),
  context: z.string().optional(),
  createdAt: z.string(),
  sessionId: z.string().optional(),
});

export const mistakeEntrySchema = z.object({
  id: z.string(),
  error: z.string(),
  rootCause: z.string(),
  fix: z.string(),
  prevention: z.string(),
  occurrences: z.number().int().min(1),
  createdAt: z.string(),
  lastSeenAt: z.string(),
  sessionId: z.string().optional(),
});

export const conventionEntrySchema = z.object({
  id: z.string(),
  convention: z.string(),
  example: z.string(),
  rationale: z.string().optional(),
  createdAt: z.string(),
  sessionId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Observation Types
// ---------------------------------------------------------------------------

export const observationTypeSchema = z.enum([
  'decision',
  'mistake',
  'convention',
  'pattern',
  'preference',
  'insight',
  'tool_outcome',
  'workflow_outcome',
]);

// ---------------------------------------------------------------------------
// Memory Search (3-Layer Pattern)
// ---------------------------------------------------------------------------

export const memoryIndexEntrySchema = z.object({
  id: z.string(),
  type: observationTypeSchema,
  title: z.string(),
  snippet: z.string(),
  createdAt: z.string(),
  sessionId: z.string().optional(),
  relevanceScore: z.number().min(0).max(1).optional(),
});

export const memoryTimelineEntrySchema = z.object({
  anchor: memoryIndexEntrySchema,
  before: z.array(memoryIndexEntrySchema),
  after: z.array(memoryIndexEntrySchema),
});

export const memoryEntrySchema = z.object({
  id: z.string(),
  type: observationTypeSchema,
  title: z.string(),
  content: z.string(),
  facts: z.array(z.string()).optional(),
  narrative: z.string().optional(),
  concepts: z.array(z.string()).optional(),
  filesRead: z.array(z.string()).optional(),
  filesModified: z.array(z.string()).optional(),
  discoveryTokens: z.number().int().min(0).optional(),
  createdAt: z.string(),
  sessionId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Session Observations
// ---------------------------------------------------------------------------

export const sessionObservationSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  type: observationTypeSchema,
  title: z.string(),
  facts: z.array(z.string()).optional(),
  narrative: z.string().optional(),
  concepts: z.array(z.string()).optional(),
  filesRead: z.array(z.string()).optional(),
  filesModified: z.array(z.string()).optional(),
  discoveryTokens: z.number().int().min(0).optional(),
  createdAt: z.string(),
});

// ---------------------------------------------------------------------------
// Context Budget
// ---------------------------------------------------------------------------

export const contextBudgetSchema = z.object({
  totalTokens: z.number().int().min(100),
  headerTokens: z.number().int().min(0),
  memoryTokens: z.number().int().min(0),
  sessionTokens: z.number().int().min(0),
  suggestionTokens: z.number().int().min(0),
  reserveTokens: z.number().int().min(0),
});

// ---------------------------------------------------------------------------
// Search & Analytics
// ---------------------------------------------------------------------------

export const searchOptionsSchema = z.object({
  type: z.union([observationTypeSchema, z.array(observationTypeSchema)]).optional(),
  project: z.string().optional(),
  dateStart: z.string().optional(),
  dateEnd: z.string().optional(),
  sessionId: z.string().optional(),
  limit: z.number().int().min(1).optional(),
  offset: z.number().int().min(0).optional(),
  orderBy: z.enum(['relevance', 'date_asc', 'date_desc']).optional(),
});

export const sessionFilterSchema = z.object({
  branch: z.string().optional(),
  status: z.enum(['active', 'completed']).optional(),
  memorySessionId: z.string().optional(),
  limit: z.number().int().min(1).optional(),
  offset: z.number().int().min(0).optional(),
});

export const analyticsQuerySchema = z.object({
  metric: z.enum(['tool_usage', 'rule_violations', 'tkb_queries', 'model_performance']),
  dateStart: z.string().optional(),
  dateEnd: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
  limit: z.number().int().min(1).optional(),
});

export const toolUsageEntrySchema = z.object({
  toolName: z.string(),
  sessionId: z.string(),
  resultQuality: z.enum(['good', 'neutral', 'bad']),
  durationMs: z.number().int().min(0).optional(),
  timestamp: z.string(),
});

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const aiddConfigSchema = z.object({
  evolution: z.object({
    enabled: z.boolean(),
    autoApplyThreshold: z.number().min(0).max(100),
    draftThreshold: z.number().min(0).max(100),
    learningPeriodSessions: z.number().int().min(0),
    killSwitch: z.boolean(),
  }),
  memory: z.object({
    maxSessionHistory: z.number().int().min(1),
    autoPromoteBranchDecisions: z.boolean(),
    pruneAfterDays: z.number().int().min(1),
  }),
  modelTracking: z.object({
    enabled: z.boolean(),
    crossProject: z.boolean(),
  }),
  ci: z.object({
    blockOn: z.array(z.string()),
    warnOn: z.array(z.string()),
    ignore: z.array(z.string()),
  }),
  content: z.object({
    overrideMode: z.enum(['merge', 'project_only', 'bundled_only']),
    tokenBudget: z.enum(['minimal', 'standard', 'full']).optional(),
  }),
});
