// ---------------------------------------------------------------------------
// Diagnostics types
// ---------------------------------------------------------------------------

export interface DiagnosisMatch {
  id: string;
  error: string;
  rootCause: string;
  fix: string;
  prevention: string;
  similarity: number;
  occurrences: number;
  category?: ErrorCategory;
}

export interface DiagnosisResult {
  query: string;
  matches: DiagnosisMatch[];
  totalMatches: number;
  category?: ErrorCategorization;
  stackTrace?: StackTraceInfo | null;
  permanentMemoryMatches?: number;
  observationMatches?: number;
}

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

// ---------------------------------------------------------------------------
// Health Trending
// ---------------------------------------------------------------------------

export type TrendDirection = 'improving' | 'stable' | 'degrading';

export interface HealthTrendResult {
  period: string;
  count: number;
  snapshots: Array<{
    timestamp: string;
    overall: number;
    sessionSuccess: number;
    complianceAvg: number;
    errorRecurrence: number;
    modelConsistency: number;
    memoryUtilization: number;
    sessionsAnalyzed: number;
  }>;
  delta: {
    overall: number;
    sessionSuccess: number;
    complianceAvg: number;
    errorRecurrence: number;
    modelConsistency: number;
    memoryUtilization: number;
  };
  direction: {
    overall: TrendDirection;
    sessionSuccess: TrendDirection;
    complianceAvg: TrendDirection;
    errorRecurrence: TrendDirection;
    modelConsistency: TrendDirection;
    memoryUtilization: TrendDirection;
  };
  alert?: string;
}

// ---------------------------------------------------------------------------
// System Health
// ---------------------------------------------------------------------------

export type SystemCheckStatus = 'healthy' | 'warning' | 'error';

export interface SystemHealthResult {
  sqlite: {
    status: SystemCheckStatus;
    dbSizeBytes: number;
    walSizeBytes: number;
    schemaVersion: number;
    tableCounts: Record<string, number>;
  };
  hooks: {
    status: SystemCheckStatus;
    active: number;
    disabled: number;
    details: Array<{
      name: string;
      failures: number;
      disabled: boolean;
      deadLetters: number;
    }>;
  };
  memory: {
    status: SystemCheckStatus;
    decisions: number;
    mistakes: number;
    conventions: number;
    observations: number;
  };
  sessions: {
    status: SystemCheckStatus;
    total: number;
    active: number;
    completed: number;
    avgCompliance: number;
  };
  overall: SystemCheckStatus;
}

// ---------------------------------------------------------------------------
// Error Taxonomy
// ---------------------------------------------------------------------------

export type ErrorCategory =
  | 'build'
  | 'runtime'
  | 'type'
  | 'config'
  | 'dependency'
  | 'network'
  | 'test'
  | 'unknown';

export interface ErrorCategorization {
  category: ErrorCategory;
  confidence: number;
  suggestion: string;
}

// ---------------------------------------------------------------------------
// Stack Trace
// ---------------------------------------------------------------------------

export interface StackFrame {
  file: string;
  line: number;
  column?: number;
  functionName?: string;
}

export interface StackTraceInfo {
  frames: StackFrame[];
  primaryFile?: string;
  primaryModule?: string;
}

// ---------------------------------------------------------------------------
// Session Comparison
// ---------------------------------------------------------------------------

export interface SessionMetricSnapshot {
  id: string;
  branch: string;
  model: string;
  complianceScore: number;
  testsPassing: boolean;
  filesModified: number;
  tasksCompleted: number;
  errorsResolved: number;
  decisions: number;
  uniqueToolsCalled: number;
  mostUsedTool?: string;
  reverts: number;
  reworks: number;
  durationMs?: number;
}

export interface SessionComparisonResult {
  sessions: SessionMetricSnapshot[];
  deltas: Array<Record<string, number>>;
  winnerByCategory: Record<string, string>;
  trend: TrendDirection;
}
