import type { ModelEntry, ModelTier, ModelRoutingResult } from '@aidd.md/mcp-shared';

// ---------------------------------------------------------------------------
// Runtime model matrix — mirrors templates/model-matrix.md (SSOT)
// Update this constant when the markdown SSOT changes.
// ---------------------------------------------------------------------------

export const MODEL_MATRIX: ModelEntry[] = [
  // -------------------------------------------------------------------------
  // Tier 1 — HIGH (Architecture, Complex Reasoning, Security)
  // -------------------------------------------------------------------------
  {
    id: 'claude-opus-4-6',
    provider: 'anthropic',
    name: 'Claude Opus 4.6',
    tier: 1,
    cognitiveProfile: ['architecture', 'reasoning', 'security', 'debugging', 'planning', 'creative'],
    contextWindow: 200_000,
    costTier: '$$$',
    status: 'active',
  },
  {
    id: 'o3',
    provider: 'openai',
    name: 'o3',
    tier: 1,
    cognitiveProfile: ['reasoning', 'research', 'analysis', 'debugging'],
    contextWindow: 200_000,
    costTier: '$$$',
    status: 'active',
  },
  {
    id: 'gpt-5.2',
    provider: 'openai',
    name: 'GPT-5.2',
    tier: 1,
    cognitiveProfile: ['reasoning', 'architecture', 'analysis'],
    contextWindow: 128_000,
    costTier: '$$$',
    status: 'active',
  },
  {
    id: 'gemini-3-pro',
    provider: 'google',
    name: 'Gemini 3 Pro',
    tier: 1,
    cognitiveProfile: ['reasoning', 'architecture', 'analysis'],
    contextWindow: 200_000,
    costTier: '$$',
    status: 'active',
  },
  {
    id: 'grok-4.1',
    provider: 'xai',
    name: 'Grok 4.1',
    tier: 1,
    cognitiveProfile: ['reasoning', 'creative', 'analysis'],
    contextWindow: 128_000,
    costTier: '$$',
    status: 'active',
  },
  {
    id: 'deepseek-v3',
    provider: 'deepseek',
    name: 'DeepSeek V3',
    tier: 1,
    cognitiveProfile: ['reasoning', 'coding', 'analysis'],
    contextWindow: 128_000,
    costTier: '$',
    status: 'active',
  },

  // -------------------------------------------------------------------------
  // Tier 2 — STANDARD (Implementation, Integration, Coding)
  // -------------------------------------------------------------------------
  {
    id: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    name: 'Claude Sonnet 4.5',
    tier: 2,
    cognitiveProfile: ['implementation', 'integration', 'coding', 'refactoring'],
    contextWindow: 200_000,
    costTier: '$$',
    status: 'active',
  },
  {
    id: 'gpt-4.5',
    provider: 'openai',
    name: 'GPT-4.5',
    tier: 2,
    cognitiveProfile: ['implementation', 'coding', 'chat'],
    contextWindow: 128_000,
    costTier: '$$',
    status: 'active',
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'google',
    name: 'Gemini 2.5 Pro',
    tier: 2,
    cognitiveProfile: ['coding', 'integration', 'reasoning'],
    contextWindow: 100_000,
    costTier: '$',
    status: 'active',
  },
  {
    id: 'llama-4-maverick',
    provider: 'meta',
    name: 'Llama 4 Maverick',
    tier: 2,
    cognitiveProfile: ['coding', 'implementation', 'integration'],
    contextWindow: 128_000,
    costTier: '$',
    status: 'active',
    selfHosted: true,
  },
  {
    id: 'mistral-large-latest',
    provider: 'mistral',
    name: 'Mistral Large',
    tier: 2,
    cognitiveProfile: ['coding', 'implementation', 'multilingual'],
    contextWindow: 128_000,
    costTier: '$$',
    status: 'active',
  },

  // -------------------------------------------------------------------------
  // Tier 3 — LOW (Boilerplate, Formatting, Simple Tasks)
  // -------------------------------------------------------------------------
  {
    id: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    name: 'Claude Haiku 4.5',
    tier: 3,
    cognitiveProfile: ['boilerplate', 'formatting', 'mechanical', 'extraction'],
    contextWindow: 100_000,
    costTier: '$',
    status: 'active',
  },
  {
    id: 'gemini-2.5-flash',
    provider: 'google',
    name: 'Gemini 2.5 Flash',
    tier: 3,
    cognitiveProfile: ['boilerplate', 'formatting', 'mechanical'],
    contextWindow: 100_000,
    costTier: '$',
    status: 'active',
  },
  {
    id: 'gemini-2.5-flash-lite',
    provider: 'google',
    name: 'Gemini 2.5 Flash-Lite',
    tier: 3,
    cognitiveProfile: ['formatting', 'mechanical', 'extraction'],
    contextWindow: 100_000,
    costTier: '$',
    status: 'active',
  },
  {
    id: 'llama-4-scout',
    provider: 'meta',
    name: 'Llama 4 Scout',
    tier: 3,
    cognitiveProfile: ['boilerplate', 'mechanical', 'formatting'],
    contextWindow: 128_000,
    costTier: '$',
    status: 'active',
    selfHosted: true,
  },
  {
    id: 'mistral-small-latest',
    provider: 'mistral',
    name: 'Mistral Small',
    tier: 3,
    cognitiveProfile: ['boilerplate', 'formatting', 'mechanical', 'multilingual'],
    contextWindow: 32_000,
    costTier: '$',
    status: 'active',
  },
];

// ---------------------------------------------------------------------------
// Default provider priority per tier
// ---------------------------------------------------------------------------

export const TIER_DEFAULTS: Record<ModelTier, string[]> = {
  1: ['anthropic', 'openai', 'google', 'xai', 'deepseek'],
  2: ['anthropic', 'openai', 'google', 'mistral', 'meta'],
  3: ['anthropic', 'google', 'mistral', 'meta'],
};

// ---------------------------------------------------------------------------
// Cognitive profile keywords → tier mapping
// ---------------------------------------------------------------------------

export const COGNITIVE_TIER_MAP: Record<string, ModelTier> = {
  // Tier 1
  architecture: 1,
  reasoning: 1,
  security: 1,
  debugging: 1,
  planning: 1,
  creative: 1,
  research: 1,
  analysis: 1,
  // Tier 2
  implementation: 2,
  integration: 2,
  coding: 2,
  refactoring: 2,
  testing: 2,
  // Tier 3
  boilerplate: 3,
  formatting: 3,
  mechanical: 3,
  git: 3,
  i18n: 3,
  copy: 3,
};

// ---------------------------------------------------------------------------
// Routing logic
// ---------------------------------------------------------------------------

function extractTaskKeywords(task: string): string[] {
  return task
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function inferTierFromTask(task: string): ModelTier | null {
  const words = extractTaskKeywords(task);
  const tierScores: Record<ModelTier, number> = { 1: 0, 2: 0, 3: 0 };

  for (const word of words) {
    const tier = COGNITIVE_TIER_MAP[word];
    if (tier !== undefined) {
      tierScores[tier]++;
    }
  }

  const maxScore = Math.max(tierScores[1], tierScores[2], tierScores[3]);
  if (maxScore === 0) return null;

  // Prefer highest tier (lowest number) on tie
  if (tierScores[1] === maxScore) return 1;
  if (tierScores[2] === maxScore) return 2;
  return 3;
}

export function routeToModel(options: {
  tier: ModelTier;
  provider?: string;
  task?: string;
  excludeDeprecated?: boolean;
}): ModelRoutingResult {
  const { tier, provider, task, excludeDeprecated = true } = options;

  // Resolve effective tier: explicit tier wins, task-inferred is fallback
  let effectiveTier = tier;
  if (task) {
    const inferred = inferTierFromTask(task);
    if (inferred !== null && inferred < effectiveTier) {
      effectiveTier = inferred; // Escalate to higher tier if task demands it
    }
  }

  // Filter models by tier and status
  let candidates = MODEL_MATRIX.filter((m) => m.tier === effectiveTier);
  if (excludeDeprecated) {
    candidates = candidates.filter((m) => m.status !== 'deprecated');
  }

  // If provider specified, prefer it
  if (provider) {
    const providerMatches = candidates.filter(
      (m) => m.provider === provider.toLowerCase(),
    );
    if (providerMatches.length > 0) {
      const recommended = providerMatches[0]!;
      const alternatives = candidates.filter((m) => m.id !== recommended.id);
      return {
        tier: effectiveTier,
        recommended,
        alternatives,
        fallbackChain: TIER_DEFAULTS[effectiveTier],
      };
    }
    // Provider not found at this tier — fall through to default ordering
  }

  // Order by default provider priority
  const providerOrder = TIER_DEFAULTS[effectiveTier];
  candidates.sort((a, b) => {
    const aIdx = providerOrder.indexOf(a.provider);
    const bIdx = providerOrder.indexOf(b.provider);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  const recommended = candidates[0]!;
  const alternatives = candidates.slice(1);

  return {
    tier: effectiveTier,
    recommended,
    alternatives,
    fallbackChain: providerOrder,
  };
}

// ---------------------------------------------------------------------------
// Matrix status (for aidd_model_matrix_status tool)
// ---------------------------------------------------------------------------

export interface MatrixStatusResult {
  totalModels: number;
  byTier: Record<number, number>;
  byProvider: Record<string, number>;
  byStatus: Record<string, number>;
  deprecatedModels: Array<{ id: string; provider: string; deprecationDate?: string }>;
  upcomingDeprecations: Array<{ id: string; provider: string; deprecationDate: string; daysLeft: number }>;
  providers: string[];
}

export function getMatrixStatus(): MatrixStatusResult {
  const byTier: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  const byProvider: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const deprecatedModels: MatrixStatusResult['deprecatedModels'] = [];
  const upcomingDeprecations: MatrixStatusResult['upcomingDeprecations'] = [];
  const providers = new Set<string>();

  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  for (const model of MODEL_MATRIX) {
    byTier[model.tier] = (byTier[model.tier] || 0) + 1;
    byProvider[model.provider] = (byProvider[model.provider] || 0) + 1;
    byStatus[model.status] = (byStatus[model.status] || 0) + 1;
    providers.add(model.provider);

    if (model.status === 'deprecated') {
      deprecatedModels.push({
        id: model.id,
        provider: model.provider,
        deprecationDate: model.deprecationDate,
      });
    }

    if (model.deprecationDate) {
      const depDate = new Date(model.deprecationDate).getTime();
      const diffMs = depDate - now;
      if (diffMs > 0 && diffMs < thirtyDaysMs) {
        upcomingDeprecations.push({
          id: model.id,
          provider: model.provider,
          deprecationDate: model.deprecationDate,
          daysLeft: Math.ceil(diffMs / (24 * 60 * 60 * 1000)),
        });
      }
    }
  }

  return {
    totalModels: MODEL_MATRIX.length,
    byTier,
    byProvider,
    byStatus,
    deprecatedModels,
    upcomingDeprecations,
    providers: [...providers],
  };
}
