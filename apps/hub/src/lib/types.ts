// Re-export shared types from @aidd.md/mcp-shared
import type { AiddConfig as _AiddConfig } from '@aidd.md/mcp-shared';
export type {
  AiddConfig,
  AiProvider,
  AnalyticsQuery,
  AnalyticsResult,
  AuditScore,
  BranchContext,
  ContextBudget,
  MemoryEntry,
  MemoryIndexEntry,
  MemoryTimelineEntry,
  ObservationType,
  ProjectInfo as McpProjectInfo,
  SearchOptions,
  SessionFilter,
  SessionObservation,
  SessionOutcome,
  SessionState,
  StackInfo,
  TokenUsage,
  ToolUsageEntry,
} from '@aidd.md/mcp-shared';

// SYNC: Inlined to avoid pulling Node.js `fs` from @aidd.md/mcp-shared into Vite browser bundle.
// SYNC: Must stay in sync with packages/shared/src/types.ts → DEFAULT_CONFIG.
export const DEFAULT_CONFIG: _AiddConfig = {
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
    tokenBudget: 'standard',
  },
};

// Hub-specific types
export type { ProjectInfo, ProjectEntry, MarkdownEntity, FileEntry, FileChangeEvent } from './tauri';

// EntityCategory is now exported from '@/lib/constants' (SSOT).
export type { EntityCategory } from './constants';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// ---------------------------------------------------------------------------
// Memory layer types (matching JSON file shapes in .aidd/memory/)
// ---------------------------------------------------------------------------

/** .aidd/memory/decisions.json entries */
export interface DecisionEntry {
  id: string;
  decision: string;
  reasoning: string;
  alternatives?: string[];
  context?: string;
  createdAt: string;
  sessionId?: string;
}

/** .aidd/memory/mistakes.json entries */
export interface MistakeEntry {
  id: string;
  error: string;
  rootCause: string;
  fix: string;
  prevention: string;
  occurrences: number;
  createdAt: string;
  lastSeenAt: string;
  sessionId?: string;
}

/** .aidd/memory/conventions.json entries */
export interface ConventionEntry {
  id: string;
  convention: string;
  example: string;
  rationale?: string;
  createdAt: string;
  sessionId?: string;
}

// ---------------------------------------------------------------------------
// Evolution types (from .aidd/evolution/)
// ---------------------------------------------------------------------------

export type EvolutionType =
  | 'routing_weight'
  | 'skill_combo'
  | 'rule_elevation'
  | 'compound_workflow'
  | 'tkb_promotion'
  | 'new_convention'
  | 'model_recommendation';

export type EvolutionAction = 'auto_applied' | 'drafted' | 'pending' | 'reverted' | 'rejected' | 'approved';

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
  status?: 'pending' | 'auto_applied' | 'drafted' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface EvolutionLogEntry {
  id: string;
  candidateId: string;
  action: EvolutionAction;
  title: string;
  confidence: number;
  snapshot?: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Drafts types (from .aidd/drafts/)
// ---------------------------------------------------------------------------

export type DraftCategory = 'rules' | 'knowledge' | 'skills' | 'workflows';
export type DraftStatus = 'pending' | 'approved' | 'rejected';

export interface DraftEntry {
  id: string;
  category: DraftCategory;
  title: string;
  filename: string;
  content?: string;
  confidence: number;
  source: 'evolution' | 'manual';
  evolutionCandidateId?: string;
  sessionId?: string;
  artifactType?: string;
  artifactId?: string;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedReason?: string;
}

// ---------------------------------------------------------------------------
// Analytics types (computed client-side from completed sessions)
// ---------------------------------------------------------------------------

export interface ModelMetrics {
  provider: string;
  model: string;
  modelId: string;
  sessionsCount: number;
  avgComplianceScore: number;
  avgReverts: number;
  avgReworks: number;
  testPassRate: number;
  positiveRate: number;
  taskTypes: Record<string, number>;
  avgStartupMs?: number;
  avgGovernanceOverheadMs?: number;
}

// ---------------------------------------------------------------------------
// Diagnostics types (computed client-side)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Artifact types (SQLite-stored workflow-produced documents)
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

// ---------------------------------------------------------------------------
// Session update payload (for update_session_full JSON merge)
// ---------------------------------------------------------------------------

export interface SessionUpdatePayload {
  name?: string;
  branch?: string;
  input?: string;
  output?: string;
  aiProvider?: {
    provider?: string;
    model?: string;
    modelId?: string;
    client?: string;
    modelTier?: string;
  };
  startedAt?: string | number;
  endedAt?: string | number | null;
  taskClassification?: {
    domain?: string;
    nature?: string;
    complexity?: string;
    fastTrack?: boolean;
    skippableStages?: string[];
  };
  outcome?: {
    testsPassing?: boolean;
    complianceScore?: number;
    reverts?: number;
    reworks?: number;
    userFeedback?: 'positive' | 'neutral' | 'negative';
  };
  tasksCompleted?: string[];
  tasksPending?: string[];
  filesModified?: string[];
  decisions?: Array<{ decision: string; reasoning: string; timestamp: string }>;
  errorsResolved?: Array<{ error: string; fix: string; timestamp: string }>;
  timingMetrics?: {
    startupMs?: number;
    governanceOverheadMs?: number;
  };
}

// ---------------------------------------------------------------------------
// Diagnostics types (computed client-side)
// ---------------------------------------------------------------------------

export interface HealthScore {
  overall: number;
  categories: {
    sessionSuccess: number;
    complianceAvg: number;
    errorRecurrence: number;
    modelConsistency: number;
    memoryUtilization: number;
  };
  sessionsAnalyzed: number;
  recommendations: string[];
}
