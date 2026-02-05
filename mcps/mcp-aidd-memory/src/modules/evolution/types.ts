// ---------------------------------------------------------------------------
// Evolution engine types
// ---------------------------------------------------------------------------

export type EvolutionType =
  | 'routing_weight'
  | 'skill_combo'
  | 'rule_elevation'
  | 'compound_workflow'
  | 'tkb_promotion'
  | 'new_convention'
  | 'model_recommendation';

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
  createdAt: string;
  updatedAt: string;
}

export interface EvolutionLogEntry {
  id: string;
  candidateId: string;
  action: 'auto_applied' | 'drafted' | 'pending' | 'reverted' | 'rejected';
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

export interface EvolutionState {
  candidates: EvolutionCandidate[];
  updatedAt: string;
}

export interface EvolutionLog {
  entries: EvolutionLogEntry[];
}
