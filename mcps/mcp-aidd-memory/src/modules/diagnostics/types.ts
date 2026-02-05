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
}

export interface DiagnosisResult {
  query: string;
  matches: DiagnosisMatch[];
  totalMatches: number;
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
