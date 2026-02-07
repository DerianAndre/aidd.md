export interface SessionSummary {
  total: number;
  active: number;
  completed: number;
  recent_sessions: SessionInfo[];
}

export interface SessionInfo {
  id: string;
  branch: string;
  started_at: string;
  status: string;
}

export interface ObservationEntry {
  id: string;
  session_id: string;
  title: string;
  type: string;
  created_at: string;
}

export interface EvolutionStatus {
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  auto_applied_count: number;
}

export interface PatternStats {
  total_patterns: number;
  active_patterns: number;
  total_detections: number;
  false_positives: number;
}
