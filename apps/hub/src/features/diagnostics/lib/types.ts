// ---------------------------------------------------------------------------
// Diagnostics — MCP response types (frontend mirrors of MCP server types)
// ---------------------------------------------------------------------------

export type TrendDirection = 'improving' | 'stable' | 'degrading';
export type SystemCheckStatus = 'healthy' | 'warning' | 'error';

// aidd_health_trend response
export interface HealthSnapshot {
  timestamp: string;
  overall: number;
  sessionSuccess: number;
  complianceAvg: number;
  errorRecurrence: number;
  modelConsistency: number;
  memoryUtilization: number;
  sessionsAnalyzed: number;
}

export interface HealthTrendResult {
  period: string;
  count: number;
  snapshots: HealthSnapshot[];
  delta: Record<string, number>;
  direction: Record<string, TrendDirection>;
  alert?: string;
}

// aidd_system_health response
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

// aidd_session_compare response
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
