import { z } from 'zod';
import {
  generateId,
  now,
  registerTool,
  createJsonResult,
  createErrorResult,
} from '@aidd.md/mcp-shared';
import type {
  AiddModule,
  ModuleContext,
  SessionState,
} from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageProvider } from '../../storage/index.js';
import { entryToMistake } from '../memory/permanent-memory.js';
import { findSimilarErrors, categorizeError, parseStackTrace } from './similarity.js';
import { hookBus } from '../hooks.js';
import type { HealthScore, TrendDirection, SystemCheckStatus } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_SESSIONS = 100;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function direction(delta: number, threshold = 3): TrendDirection {
  return delta > threshold ? 'improving' : delta < -threshold ? 'degrading' : 'stable';
}

// ---------------------------------------------------------------------------
// Shared health computation (used by tool + auto-hook)
// ---------------------------------------------------------------------------

async function computeHealthScore(
  storage: StorageProvider,
  sessionsLimit: number,
): Promise<HealthScore | null> {
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

  if (sessions.length === 0) return null;

  // 1. Session success rate
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

  // 3. Error recurrence
  const mistakeEntries = await backend.listPermanentMemory({ type: 'mistake' });
  const mistakes = mistakeEntries.map(entryToMistake);
  const recurringMistakes = mistakes.filter((m) => m.occurrences > 1);
  const errorRecurrence = mistakes.length > 0
    ? Math.round((1 - recurringMistakes.length / Math.max(mistakes.length, 1)) * 100)
    : 100;

  // 4. Model consistency
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

  // 5. Memory utilization
  let memoryUseCount = 0;
  for (const s of sessions) {
    if (s.decisions.length > 0 || s.errorsResolved.length > 0) {
      memoryUseCount++;
    }
  }
  const memoryUtilization = Math.round((memoryUseCount / sessions.length) * 100);

  // Composite score
  const overall = Math.round(
    sessionSuccess * 0.3 +
    complianceAvg * 0.25 +
    errorRecurrence * 0.15 +
    modelConsistency * 0.15 +
    memoryUtilization * 0.15,
  );

  // Recommendations
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

  return {
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
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createDiagnosticsModule(storage: StorageProvider): AiddModule {
  return {
    name: 'diagnostics',
    description: 'Error diagnosis, project health scoring, health trending, system health, and session comparison',

    register(server: McpServer, _context: ModuleContext) {
      // ================================================================
      // Tool: aidd_diagnose_error (enhanced with categorization + stack trace)
      // ================================================================
      registerTool(server, {
        name: 'aidd_diagnose_error',
        description:
          'Search memory for similar past mistakes and their fixes. Combines permanent memory with observation search. Includes error categorization and stack trace parsing.',
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

          // Categorize the error
          const categorization = categorizeError(error);

          // Parse stack trace (if present)
          const stackTrace = parseStackTrace(error);

          // Search permanent memory mistakes
          const backend = await storage.getBackend();
          const mistakeEntries = await backend.listPermanentMemory({ type: 'mistake' });
          const mistakes = mistakeEntries.map(entryToMistake);
          const similar = findSimilarErrors(error, mistakes, threshold);

          // Boost scores for matches from same file/module
          if (stackTrace?.primaryFile) {
            const fileLower = stackTrace.primaryFile.toLowerCase();
            const moduleLower = stackTrace.primaryModule?.toLowerCase();
            for (const m of similar) {
              const combined = [m.error, m.rootCause, m.fix].join(' ').toLowerCase();
              if (combined.includes(fileLower)) {
                m.similarity = Math.min(1, m.similarity + 0.15);
              } else if (moduleLower && combined.includes(moduleLower)) {
                m.similarity = Math.min(1, m.similarity + 0.08);
              }
            }
            similar.sort((a, b) => b.similarity - a.similarity);
          }

          // Also search observations for mistake-type entries
          const obsResults = await backend.search(error, { type: 'mistake', limit: limit * 2 });

          // Merge: mistakes first (richer data), then observations
          const matches = similar.slice(0, limit).map((m) => ({
            id: m.id,
            error: m.error,
            rootCause: m.rootCause,
            fix: m.fix,
            prevention: m.prevention,
            similarity: m.similarity,
            occurrences: m.occurrences,
            category: categorization.category,
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
              category: categorization.category,
            });
          }

          return createJsonResult({
            query: error,
            category: categorization,
            stackTrace: stackTrace ?? undefined,
            matches,
            totalMatches: matches.length,
            permanentMemoryMatches: similar.length,
            observationMatches: obsResults.length,
          });
        },
      });

      // ================================================================
      // Tool: aidd_project_health
      // ================================================================
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

          const health = await computeHealthScore(storage, sessionsLimit);
          if (!health) {
            return createJsonResult({
              overall: 0,
              message: 'No completed sessions found for health analysis',
              sessionsAnalyzed: 0,
            });
          }

          return createJsonResult(health);
        },
      });

      // ================================================================
      // Tool: aidd_health_trend (NEW — health trending over time)
      // ================================================================
      registerTool(server, {
        name: 'aidd_health_trend',
        description:
          'Show health score trends over time. Auto-snapshots are stored after each session end. Returns snapshots, deltas, direction per category, and alerts on degradation.',
        schema: {
          period: z.enum(['7d', '30d', '90d', 'all']).optional().default('30d')
            .describe('"7d" | "30d" | "90d" | "all" (default: "30d")'),
          limit: z.number().optional().default(20)
            .describe('Max snapshots to return (default: 20)'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { period, limit } = args as { period: string; limit: number };
          const backend = await storage.getBackend();

          const periodMs: Record<string, number> = {
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
            '90d': 90 * 24 * 60 * 60 * 1000,
          };
          const since = period === 'all'
            ? undefined
            : new Date(Date.now() - (periodMs[period] ?? periodMs['30d']!)).toISOString();

          const snapshots = await backend.listHealthSnapshots({
            since,
            limit: Math.min(limit, 100),
          });

          if (snapshots.length === 0) {
            return createJsonResult({
              message: 'No health snapshots found. Snapshots auto-generate after each session end.',
              period,
              count: 0,
              snapshots: [],
            });
          }

          // Delta: newest - oldest
          const newest = snapshots[0]!;
          const oldest = snapshots[snapshots.length - 1]!;

          const delta = {
            overall: round2(newest.overall - oldest.overall),
            sessionSuccess: round2(newest.sessionSuccess - oldest.sessionSuccess),
            complianceAvg: round2(newest.complianceAvg - oldest.complianceAvg),
            errorRecurrence: round2(newest.errorRecurrence - oldest.errorRecurrence),
            modelConsistency: round2(newest.modelConsistency - oldest.modelConsistency),
            memoryUtilization: round2(newest.memoryUtilization - oldest.memoryUtilization),
          };

          const directions = {
            overall: direction(delta.overall),
            sessionSuccess: direction(delta.sessionSuccess),
            complianceAvg: direction(delta.complianceAvg),
            errorRecurrence: direction(delta.errorRecurrence),
            modelConsistency: direction(delta.modelConsistency),
            memoryUtilization: direction(delta.memoryUtilization),
          };

          // Alert: check if overall dropped >15 in recent snapshots
          let alert: string | undefined;
          if (snapshots.length >= 2) {
            const recent = snapshots.slice(0, Math.min(5, snapshots.length));
            const recentDrop = recent[recent.length - 1]!.overall - recent[0]!.overall;
            if (recentDrop > 15) {
              alert = `Health dropped ${round2(recentDrop)} points in last ${recent.length} snapshots`;
            }
          }

          return createJsonResult({
            period,
            count: snapshots.length,
            snapshots: snapshots.map((s) => ({
              timestamp: s.timestamp,
              overall: s.overall,
              sessionSuccess: s.sessionSuccess,
              complianceAvg: s.complianceAvg,
              errorRecurrence: s.errorRecurrence,
              modelConsistency: s.modelConsistency,
              memoryUtilization: s.memoryUtilization,
              sessionsAnalyzed: s.sessionsAnalyzed,
            })),
            delta,
            direction: directions,
            alert,
          });
        },
      });

      // ================================================================
      // Tool: aidd_system_health (NEW — runtime MCP diagnostics)
      // ================================================================
      registerTool(server, {
        name: 'aidd_system_health',
        description:
          'Diagnose the MCP server runtime health. Checks SQLite database, HookBus status, memory counts, and session stats.',
        schema: {},
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async () => {
          const backend = await storage.getBackend();

          // 1. SQLite diagnostics
          const diag = await backend.getSystemDiagnostics();

          const sqliteStatus: SystemCheckStatus =
            diag.dbSizeBytes > 100 * 1024 * 1024 ? 'warning' : // >100MB
            diag.walSizeBytes > 50 * 1024 * 1024 ? 'warning' : // WAL >50MB
            'healthy';

          // 2. HookBus status
          const hookStatuses = hookBus.status();
          const disabledCount = hookStatuses.filter((h) => h.disabled).length;
          const hooksStatus: SystemCheckStatus =
            disabledCount > 0 ? 'warning' : 'healthy';

          // 3. Memory counts
          const decisions = (await backend.listPermanentMemory({ type: 'decision' })).length;
          const mistakes = (await backend.listPermanentMemory({ type: 'mistake' })).length;
          const conventions = (await backend.listPermanentMemory({ type: 'convention' })).length;
          const observations = diag.tableCounts['observations'] ?? 0;

          const memoryStatus: SystemCheckStatus =
            (decisions + mistakes + conventions) === 0 ? 'warning' : 'healthy';

          // 4. Session stats
          const activeSessions = await backend.listSessions({ status: 'active', limit: 1000 });
          const completedSessions = await backend.listSessions({ status: 'completed', limit: 1000 });
          const totalSessions = activeSessions.length + completedSessions.length;

          let avgCompliance = 0;
          if (completedSessions.length > 0) {
            let total = 0;
            let count = 0;
            for (const entry of completedSessions.slice(0, 50)) {
              const s = await backend.getSession(entry.id);
              if (s?.outcome) {
                total += s.outcome.complianceScore;
                count++;
              }
            }
            avgCompliance = count > 0 ? Math.round(total / count) : 0;
          }

          const sessionsStatus: SystemCheckStatus =
            totalSessions === 0 ? 'warning' :
            avgCompliance < 50 ? 'warning' : 'healthy';

          // Overall: worst of all sections
          const statuses: SystemCheckStatus[] = [sqliteStatus, hooksStatus, memoryStatus, sessionsStatus];
          const overall: SystemCheckStatus =
            statuses.includes('error') ? 'error' :
            statuses.includes('warning') ? 'warning' : 'healthy';

          return createJsonResult({
            sqlite: {
              status: sqliteStatus,
              dbSizeBytes: diag.dbSizeBytes,
              walSizeBytes: diag.walSizeBytes,
              schemaVersion: diag.schemaVersion,
              tableCounts: diag.tableCounts,
            },
            hooks: {
              status: hooksStatus,
              active: hookStatuses.length - disabledCount,
              disabled: disabledCount,
              details: hookStatuses.map((h) => ({
                name: h.name,
                failures: h.failures,
                disabled: h.disabled,
                deadLetters: h.deadLetters,
              })),
            },
            memory: {
              status: memoryStatus,
              decisions,
              mistakes,
              conventions,
              observations,
            },
            sessions: {
              status: sessionsStatus,
              total: totalSessions,
              active: activeSessions.length,
              completed: completedSessions.length,
              avgCompliance,
            },
            overall,
          });
        },
      });

      // ================================================================
      // Tool: aidd_session_compare (NEW — session comparison)
      // ================================================================
      registerTool(server, {
        name: 'aidd_session_compare',
        description:
          'Compare sessions side-by-side across compliance, tests, files, tasks, tools, errors. Supports comparing specific IDs or last N sessions.',
        schema: {
          sessionIds: z.array(z.string()).min(2).max(5).optional()
            .describe('Session IDs to compare (2-5)'),
          last: z.number().min(2).max(5).optional().default(2)
            .describe('Compare last N completed sessions (default: 2)'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { sessionIds, last } = args as {
            sessionIds?: string[];
            last: number;
          };

          const backend = await storage.getBackend();
          const sessions: SessionState[] = [];

          if (sessionIds && sessionIds.length >= 2) {
            for (const id of sessionIds) {
              const s = await backend.getSession(id);
              if (s) sessions.push(s);
            }
            if (sessions.length < 2) {
              return createErrorResult(
                `Need at least 2 valid sessions. Found ${sessions.length} of ${sessionIds.length} requested.`,
              );
            }
          } else {
            const entries = await backend.listSessions({
              status: 'completed',
              limit: last,
            });
            for (const entry of entries) {
              const s = await backend.getSession(entry.id);
              if (s) sessions.push(s);
            }
            if (sessions.length < 2) {
              return createErrorResult(
                `Need at least 2 completed sessions for comparison. Found ${sessions.length}.`,
              );
            }
          }

          // Sort by startedAt ascending
          sessions.sort((a, b) =>
            new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
          );

          // Build metric snapshots
          const snapshots = sessions.map((s) => {
            const toolSet = new Set(s.toolsCalled.map((t) => t.name));
            const toolCounts = new Map<string, number>();
            for (const t of s.toolsCalled) {
              toolCounts.set(t.name, (toolCounts.get(t.name) ?? 0) + 1);
            }
            let mostUsedTool: string | undefined;
            let maxCount = 0;
            for (const [name, count] of toolCounts) {
              if (count > maxCount) {
                maxCount = count;
                mostUsedTool = name;
              }
            }

            let durationMs: number | undefined;
            if (s.startedAt && s.endedAt) {
              durationMs = new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime();
            }

            return {
              id: s.id,
              branch: s.branch,
              model: s.aiProvider.modelId,
              complianceScore: s.outcome?.complianceScore ?? 0,
              testsPassing: s.outcome?.testsPassing ?? false,
              filesModified: s.filesModified.length,
              tasksCompleted: s.tasksCompleted.length,
              errorsResolved: s.errorsResolved.length,
              decisions: s.decisions.length,
              uniqueToolsCalled: toolSet.size,
              mostUsedTool,
              reverts: s.outcome?.reverts ?? 0,
              reworks: s.outcome?.reworks ?? 0,
              durationMs,
            };
          });

          // Deltas between consecutive sessions
          const deltas: Array<Record<string, number>> = [];
          for (let i = 1; i < snapshots.length; i++) {
            const prev = snapshots[i - 1]!;
            const curr = snapshots[i]!;
            deltas.push({
              complianceScore: curr.complianceScore - prev.complianceScore,
              filesModified: curr.filesModified - prev.filesModified,
              tasksCompleted: curr.tasksCompleted - prev.tasksCompleted,
              errorsResolved: curr.errorsResolved - prev.errorsResolved,
              decisions: curr.decisions - prev.decisions,
              uniqueToolsCalled: curr.uniqueToolsCalled - prev.uniqueToolsCalled,
              reverts: curr.reverts - prev.reverts,
              reworks: curr.reworks - prev.reworks,
            });
          }

          // Winner by category (higher is better)
          const winnerByCategory: Record<string, string> = {};
          const higherBetter = ['complianceScore', 'tasksCompleted', 'errorsResolved', 'decisions'] as const;
          for (const key of higherBetter) {
            let best = snapshots[0]!;
            for (const s of snapshots) {
              if (s[key] > best[key]) best = s;
            }
            winnerByCategory[key] = best.id;
          }
          // Fewer reverts/reworks is better
          let fewestReverts = snapshots[0]!;
          let fewestReworks = snapshots[0]!;
          for (const s of snapshots) {
            if (s.reverts < fewestReverts.reverts) fewestReverts = s;
            if (s.reworks < fewestReworks.reworks) fewestReworks = s;
          }
          winnerByCategory['fewestReverts'] = fewestReverts.id;
          winnerByCategory['fewestReworks'] = fewestReworks.id;

          // Trend based on compliance
          const first = snapshots[0]!;
          const latest = snapshots[snapshots.length - 1]!;
          const complianceDelta = latest.complianceScore - first.complianceScore;
          const trend: TrendDirection = complianceDelta > 5 ? 'improving'
            : complianceDelta < -5 ? 'degrading'
            : 'stable';

          return createJsonResult({
            sessions: snapshots,
            deltas,
            winnerByCategory,
            trend,
          });
        },
      });

      // ================================================================
      // Auto-hook: health snapshot on session end (zero AI token cost)
      // ================================================================
      hookBus.register('health-auto-snapshot', async (event) => {
        if (event.type !== 'session_ended') return;

        const health = await computeHealthScore(storage, 50);
        if (!health) return;

        const backend = await storage.getBackend();
        await backend.saveHealthSnapshot({
          id: generateId(),
          timestamp: now(),
          overall: health.overall,
          sessionSuccess: health.categories.sessionSuccess,
          complianceAvg: health.categories.complianceAvg,
          errorRecurrence: health.categories.errorRecurrence,
          modelConsistency: health.categories.modelConsistency,
          memoryUtilization: health.categories.memoryUtilization,
          sessionsAnalyzed: health.sessionsAnalyzed,
          sessionId: event.sessionId,
        });
      });
    },
  };
}
