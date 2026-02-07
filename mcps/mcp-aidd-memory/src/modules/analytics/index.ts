import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  createErrorResult,
} from '@aidd.md/mcp-shared';
import type {
  AiddModule,
  ModuleContext,
  ModelFingerprint,
  SessionState,
} from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageProvider } from '../../storage/index.js';
import type { ModelMetrics, ModelComparison, ModelRecommendation } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_SESSIONS = 200;

async function loadCompletedSessions(storage: StorageProvider): Promise<SessionState[]> {
  const backend = await storage.getBackend();
  const entries = await backend.listSessions({ status: 'completed', limit: MAX_SESSIONS });
  const sessions: SessionState[] = [];

  for (const entry of entries) {
    const session = await backend.getSession(entry.id);
    if (session) sessions.push(session);
  }

  return sessions;
}

function computeMetrics(modelId: string, sessions: SessionState[]): ModelMetrics {
  const first = sessions[0]!;
  let totalCompliance = 0;
  let totalReverts = 0;
  let totalReworks = 0;
  let testPassCount = 0;
  let positiveCount = 0;
  let outcomeCount = 0;
  const taskTypes: Record<string, number> = {};

  // Token usage accumulators
  let totalInput = 0;
  let totalOutput = 0;
  let tokenCount = 0;
  let totalEfficiency = 0;
  let efficiencyCount = 0;

  // Fingerprint accumulators
  let fpCount = 0;
  const fpSums: Record<keyof ModelFingerprint, number> = {
    avgSentenceLength: 0,
    sentenceLengthVariance: 0,
    typeTokenRatio: 0,
    avgParagraphLength: 0,
    passiveVoiceRatio: 0,
    fillerDensity: 0,
    questionFrequency: 0,
  };

  for (const s of sessions) {
    if (s.outcome) {
      outcomeCount++;
      totalCompliance += s.outcome.complianceScore;
      totalReverts += s.outcome.reverts;
      totalReworks += s.outcome.reworks;
      if (s.outcome.testsPassing) testPassCount++;
      if (s.outcome.userFeedback === 'positive') positiveCount++;
      if (s.outcome.contextEfficiency != null) {
        efficiencyCount++;
        totalEfficiency += s.outcome.contextEfficiency;
      }
    }
    if (s.tokenUsage) {
      tokenCount++;
      totalInput += s.tokenUsage.inputTokens;
      totalOutput += s.tokenUsage.outputTokens;
    }
    if (s.fingerprint) {
      fpCount++;
      for (const key of Object.keys(fpSums) as (keyof ModelFingerprint)[]) {
        fpSums[key] += s.fingerprint[key];
      }
    }
    const domain = s.taskClassification?.domain ?? 'unknown';
    taskTypes[domain] = (taskTypes[domain] ?? 0) + 1;
  }

  const count = Math.max(outcomeCount, 1);

  return {
    provider: first.aiProvider.provider,
    model: first.aiProvider.model,
    modelId,
    sessionsCount: sessions.length,
    avgComplianceScore: Math.round((totalCompliance / count) * 100) / 100,
    avgReverts: Math.round((totalReverts / count) * 100) / 100,
    avgReworks: Math.round((totalReworks / count) * 100) / 100,
    testPassRate: Math.round((testPassCount / count) * 100) / 100,
    positiveRate: Math.round((positiveCount / count) * 100) / 100,
    taskTypes,
    // Extended metrics
    avgInputTokens: tokenCount > 0 ? Math.round(totalInput / tokenCount) : undefined,
    avgOutputTokens: tokenCount > 0 ? Math.round(totalOutput / tokenCount) : undefined,
    avgContextEfficiency: efficiencyCount > 0
      ? Math.round((totalEfficiency / efficiencyCount) * 100) / 100
      : undefined,
    avgFingerprint: fpCount > 0
      ? {
          avgSentenceLength: Math.round((fpSums.avgSentenceLength / fpCount) * 100) / 100,
          sentenceLengthVariance: Math.round((fpSums.sentenceLengthVariance / fpCount) * 100) / 100,
          typeTokenRatio: Math.round((fpSums.typeTokenRatio / fpCount) * 1000) / 1000,
          avgParagraphLength: Math.round((fpSums.avgParagraphLength / fpCount) * 100) / 100,
          passiveVoiceRatio: Math.round((fpSums.passiveVoiceRatio / fpCount) * 1000) / 1000,
          fillerDensity: Math.round((fpSums.fillerDensity / fpCount) * 100) / 100,
          questionFrequency: Math.round((fpSums.questionFrequency / fpCount) * 100) / 100,
        }
      : undefined,
  };
}

function scoreModel(m: ModelMetrics): number {
  const base =
    m.avgComplianceScore * 0.35 +
    m.testPassRate * 100 * 0.3 +
    (1 - Math.min(m.avgReverts, 5) / 5) * 100 * 0.15 +
    m.positiveRate * 100 * 0.1;

  // Context efficiency: 10% weight (neutral 50 if no data)
  const efficiency = m.avgContextEfficiency != null
    ? Math.min(m.avgContextEfficiency * 10, 100)
    : 50;

  return base + efficiency * 0.1;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createAnalyticsModule(storage: StorageProvider): AiddModule {
  return {
    name: 'analytics',
    description: 'AI model performance analytics — metrics, comparison, recommendations',

    register(server: McpServer, _context: ModuleContext) {
      // ---- Model Performance ----
      registerTool(server, {
        name: 'aidd_model_performance',
        description:
          'Get AI model performance metrics aggregated from completed sessions. Shows compliance scores, test pass rates, revert rates, and more per model.',
        schema: {
          model: z.string().optional().describe('Filter by model name'),
          provider: z.string().optional().describe('Filter by provider'),
          limit: z.number().optional().default(10).describe('Max models to return'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { model, provider, limit } = args as {
            model?: string;
            provider?: string;
            limit: number;
          };

          const sessions = await loadCompletedSessions(storage);
          if (sessions.length === 0) {
            return createJsonResult({ models: [], message: 'No completed sessions found' });
          }

          // Group by modelId
          const groups = new Map<string, SessionState[]>();
          for (const s of sessions) {
            if (model && s.aiProvider.model !== model) continue;
            if (provider && s.aiProvider.provider !== provider) continue;
            const key = s.aiProvider.modelId;
            const list = groups.get(key) ?? [];
            list.push(s);
            groups.set(key, list);
          }

          const metrics: ModelMetrics[] = [];
          for (const [modelId, group] of groups) {
            metrics.push(computeMetrics(modelId, group));
          }

          // Sort by composite score
          metrics.sort((a, b) => scoreModel(b) - scoreModel(a));

          return createJsonResult({
            count: Math.min(metrics.length, limit),
            totalSessions: sessions.length,
            models: metrics.slice(0, limit),
          });
        },
      });

      // ---- Model Compare ----
      registerTool(server, {
        name: 'aidd_model_compare',
        description:
          'Side-by-side comparison of AI models based on session outcomes. Determines winner and best model per category.',
        schema: {
          models: z.array(z.string()).describe('Model IDs to compare (at least 2)'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { models } = args as { models: string[] };
          if (models.length < 2) return createErrorResult('At least 2 model IDs required');

          const sessions = await loadCompletedSessions(storage);
          const modelSet = new Set(models);

          const groups = new Map<string, SessionState[]>();
          for (const s of sessions) {
            if (!modelSet.has(s.aiProvider.modelId)) continue;
            const list = groups.get(s.aiProvider.modelId) ?? [];
            list.push(s);
            groups.set(s.aiProvider.modelId, list);
          }

          const metricsArr: ModelMetrics[] = [];
          for (const modelId of models) {
            const group = groups.get(modelId);
            if (!group || group.length === 0) continue;
            metricsArr.push(computeMetrics(modelId, group));
          }

          if (metricsArr.length < 2) {
            return createErrorResult('Not enough data — need completed sessions for at least 2 of the specified models');
          }

          // Determine winner + best by category
          const bestByCategory: Record<string, string> = {};
          let bestCompliance = metricsArr[0]!;
          let bestTestPass = metricsArr[0]!;
          let bestReverts = metricsArr[0]!;
          let bestFeedback = metricsArr[0]!;

          for (const m of metricsArr) {
            if (m.avgComplianceScore > bestCompliance.avgComplianceScore) bestCompliance = m;
            if (m.testPassRate > bestTestPass.testPassRate) bestTestPass = m;
            if (m.avgReverts < bestReverts.avgReverts) bestReverts = m;
            if (m.positiveRate > bestFeedback.positiveRate) bestFeedback = m;
          }

          bestByCategory['compliance'] = bestCompliance.modelId;
          bestByCategory['testPassRate'] = bestTestPass.modelId;
          bestByCategory['fewestReverts'] = bestReverts.modelId;
          bestByCategory['userFeedback'] = bestFeedback.modelId;

          // Overall winner by composite score
          metricsArr.sort((a, b) => scoreModel(b) - scoreModel(a));

          const comparison: ModelComparison = {
            models: metricsArr,
            winner: metricsArr[0]!.modelId,
            bestByCategory,
          };

          return createJsonResult(comparison);
        },
      });

      // ---- Model Recommend ----
      registerTool(server, {
        name: 'aidd_model_recommend',
        description:
          'Recommend the best AI model for a specific task type based on historical session outcomes.',
        schema: {
          taskDomain: z.string().describe('Task domain (frontend, backend, fullstack, etc.)'),
          taskComplexity: z.string().optional().describe('Task complexity (trivial, moderate, complex)'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { taskDomain, taskComplexity } = args as {
            taskDomain: string;
            taskComplexity?: string;
          };

          const sessions = await loadCompletedSessions(storage);

          // Filter by task type
          const filtered = sessions.filter((s) => {
            if (s.taskClassification?.domain !== taskDomain) return false;
            if (taskComplexity && s.taskClassification?.complexity !== taskComplexity) return false;
            return true;
          });

          if (filtered.length === 0) {
            return createJsonResult({
              recommended: null,
              message: `No completed sessions found for domain="${taskDomain}"${taskComplexity ? ` complexity="${taskComplexity}"` : ''}`,
            });
          }

          // Group by modelId
          const groups = new Map<string, SessionState[]>();
          for (const s of filtered) {
            const key = s.aiProvider.modelId;
            const list = groups.get(key) ?? [];
            list.push(s);
            groups.set(key, list);
          }

          const metricsArr: ModelMetrics[] = [];
          for (const [modelId, group] of groups) {
            metricsArr.push(computeMetrics(modelId, group));
          }

          metricsArr.sort((a, b) => scoreModel(b) - scoreModel(a));

          const best = metricsArr[0]!;
          const confidence = Math.min(100, Math.round(best.sessionsCount * 10));

          const recommendation: ModelRecommendation = {
            recommended: best.modelId,
            confidence,
            reasoning: `Best for ${taskDomain}${taskComplexity ? ` (${taskComplexity})` : ''}: ${best.avgComplianceScore} avg compliance, ${Math.round(best.testPassRate * 100)}% test pass rate across ${best.sessionsCount} sessions.`,
            alternatives: metricsArr.slice(1, 4).map((m) => ({
              model: m.modelId,
              tradeoff: `${m.sessionsCount} sessions, ${m.avgComplianceScore} compliance, ${Math.round(m.testPassRate * 100)}% tests`,
            })),
          };

          return createJsonResult(recommendation);
        },
      });
    },
  };
}
