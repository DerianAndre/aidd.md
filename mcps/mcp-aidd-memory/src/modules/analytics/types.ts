// ---------------------------------------------------------------------------
// Model analytics types
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
}

export interface ModelComparison {
  models: ModelMetrics[];
  winner: string;
  bestByCategory: Record<string, string>;
}

export interface ModelRecommendation {
  recommended: string;
  confidence: number;
  reasoning: string;
  alternatives: Array<{ model: string; tradeoff: string }>;
}
