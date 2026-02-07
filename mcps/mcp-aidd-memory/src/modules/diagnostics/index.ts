import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
} from '@aidd.md/mcp-shared';
import type {
  AiddModule,
  ModuleContext,
  SessionState,
} from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageProvider } from '../../storage/index.js';
import { entryToMistake } from '../memory/permanent-memory.js';
import { findSimilarErrors } from './similarity.js';
import type { HealthScore } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_SESSIONS = 100;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createDiagnosticsModule(storage: StorageProvider): AiddModule {
  return {
    name: 'diagnostics',
    description: 'Error diagnosis and project health scoring',

    register(server: McpServer, _context: ModuleContext) {
      // ---- Diagnose error ----
      registerTool(server, {
        name: 'aidd_diagnose_error',
        description:
          'Search memory for similar past mistakes and their fixes. Combines permanent memory with observation search.',
        schema: {
          error: z.string().describe('Error message or description to diagnose'),
          limit: z.number().optional().default(5).describe('Max matches to return'),
          threshold: z.number().optional().default(0.3).describe('Minimum similarity score (0-1)'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { error, limit, threshold } = args as {
            error: string;
            limit: number;
            threshold: number;
          };

          // Search permanent memory mistakes via backend
          const backend = await storage.getBackend();
          const mistakeEntries = await backend.listPermanentMemory({ type: 'mistake' });
          const mistakes = mistakeEntries.map(entryToMistake);
          const similar = findSimilarErrors(error, mistakes, threshold);

          // Also search observations for mistake-type entries
          const obsResults = await backend.search(error, { type: 'mistake', limit: limit * 2 });

          // Merge: mistakes first (richer data), then observations for additional context
          const matches = similar.slice(0, limit).map((m) => ({
            id: m.id,
            error: m.error,
            rootCause: m.rootCause,
            fix: m.fix,
            prevention: m.prevention,
            similarity: m.similarity,
            occurrences: m.occurrences,
          }));

          // Add observation results not already in matches
          const matchIds = new Set(matches.map((m) => m.id));
          for (const obs of obsResults) {
            if (matchIds.has(obs.id)) continue;
            if (matches.length >= limit) break;
            matches.push({
              id: obs.id,
              error: obs.title,
              rootCause: obs.snippet,
              fix: '',
              prevention: '',
              similarity: obs.relevanceScore ?? 0,
              occurrences: 1,
            });
          }

          return createJsonResult({
            query: error,
            matches,
            totalMatches: matches.length,
            permanentMemoryMatches: similar.length,
            observationMatches: obsResults.length,
          });
        },
      });

      // ---- Project health ----
      registerTool(server, {
        name: 'aidd_project_health',
        description:
          'Calculate a data-driven project health score from session analytics. Scores across 5 categories: session success, compliance, error recurrence, model consistency, memory utilization.',
        schema: {
          sessionsLimit: z.number().optional().default(50).describe('Number of recent sessions to analyze'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { sessionsLimit } = args as { sessionsLimit: number };

          const backend = await storage.getBackend();
          const entries = await backend.listSessions({
            status: 'completed',
            limit: Math.min(sessionsLimit, MAX_SESSIONS),
          });

          const sessions: SessionState[] = [];
          for (const entry of entries) {
            const session = await backend.getSession(entry.id);
            if (session) sessions.push(session);
          }

          if (sessions.length === 0) {
            return createJsonResult({
              overall: 0,
              message: 'No completed sessions found for health analysis',
              sessionsAnalyzed: 0,
            });
          }

          // 1. Session success rate (% with positive outcome or passing tests)
          let successCount = 0;
          let outcomeCount = 0;
          for (const s of sessions) {
            if (s.outcome) {
              outcomeCount++;
              if (s.outcome.testsPassing && s.outcome.reverts === 0) successCount++;
            }
          }
          const sessionSuccess = outcomeCount > 0
            ? Math.round((successCount / outcomeCount) * 100)
            : 50;

          // 2. Average compliance score
          let totalCompliance = 0;
          let complianceCount = 0;
          for (const s of sessions) {
            if (s.outcome) {
              complianceCount++;
              totalCompliance += s.outcome.complianceScore;
            }
          }
          const complianceAvg = complianceCount > 0
            ? Math.round(totalCompliance / complianceCount)
            : 50;

          // 3. Error recurrence (inverse — fewer recurring errors = better)
          const mistakeEntries = await backend.listPermanentMemory({ type: 'mistake' });
          const mistakes = mistakeEntries.map(entryToMistake);
          const recurringMistakes = mistakes.filter((m) => m.occurrences > 1);
          const errorRecurrence = mistakes.length > 0
            ? Math.round((1 - recurringMistakes.length / Math.max(mistakes.length, 1)) * 100)
            : 100;

          // 4. Model consistency (low variance in compliance across models)
          const modelScores = new Map<string, number[]>();
          for (const s of sessions) {
            if (s.outcome) {
              const list = modelScores.get(s.aiProvider.modelId) ?? [];
              list.push(s.outcome.complianceScore);
              modelScores.set(s.aiProvider.modelId, list);
            }
          }
          let totalVariance = 0;
          let modelCount = 0;
          for (const scores of modelScores.values()) {
            if (scores.length < 2) continue;
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            const variance = scores.reduce((a, b) => a + (b - avg) ** 2, 0) / scores.length;
            totalVariance += Math.sqrt(variance);
            modelCount++;
          }
          const avgStdDev = modelCount > 0 ? totalVariance / modelCount : 0;
          const modelConsistency = Math.round(Math.max(0, 100 - avgStdDev));

          // 5. Memory utilization (% sessions with observations or decisions)
          let memoryUseCount = 0;
          for (const s of sessions) {
            if (s.decisions.length > 0 || s.errorsResolved.length > 0) {
              memoryUseCount++;
            }
          }
          const memoryUtilization = Math.round((memoryUseCount / sessions.length) * 100);

          // Composite score (weighted)
          const overall = Math.round(
            sessionSuccess * 0.3 +
            complianceAvg * 0.25 +
            errorRecurrence * 0.15 +
            modelConsistency * 0.15 +
            memoryUtilization * 0.15,
          );

          // Generate recommendations
          const recommendations: string[] = [];
          if (sessionSuccess < 60) {
            recommendations.push('Session success rate is low. Review recent failures and consider adding conventions.');
          }
          if (complianceAvg < 70) {
            recommendations.push('Compliance scores are below target. Review rule violations and add relevant conventions.');
          }
          if (errorRecurrence < 60) {
            recommendations.push('High error recurrence detected. Consider creating prevention rules for recurring mistakes.');
          }
          if (modelConsistency < 60) {
            recommendations.push('Model performance is inconsistent. Consider standardizing on better-performing models.');
          }
          if (memoryUtilization < 50) {
            recommendations.push('Low memory utilization. Record more decisions and observations to improve future sessions.');
          }
          if (recommendations.length === 0) {
            recommendations.push('Project health is good. Continue recording observations and decisions.');
          }

          const health: HealthScore = {
            overall,
            categories: {
              sessionSuccess,
              complianceAvg,
              errorRecurrence,
              modelConsistency,
              memoryUtilization,
            },
            sessionsAnalyzed: sessions.length,
            recommendations,
          };

          return createJsonResult(health);
        },
      });
    },
  };
}
