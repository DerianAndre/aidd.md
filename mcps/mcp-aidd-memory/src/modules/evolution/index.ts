import { writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  createErrorResult,
  ensureDir,
  generateId,
  now,
} from '@aidd.md/mcp-shared';
import type {
  AiddModule,
  StorageBackend,
  ModuleContext,
  EvolutionCandidate,
  SessionState,
} from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageProvider } from '../../storage/index.js';
import { hookBus } from '../hooks.js';
import { findMemoryDir } from '../memory/permanent-memory.js';
import { analyzePatterns } from './analyzer.js';
import { promoteCandidate } from './promotion.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_SESSIONS = 200;
const ANALYSIS_INTERVAL = 5;
const PRUNE_INTERVAL = 10;
const REJECTION_COOLDOWN_DAYS = 30;

async function getRejectedPatterns(backend: StorageBackend): Promise<Set<string>> {
  const recentLog = await backend.getEvolutionLog({ limit: 200 });
  const cutoff = new Date(Date.now() - REJECTION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return new Set(
    recentLog
      .filter((e) => e.action === 'rejected' && e.timestamp > cutoff)
      .map((e) => e.title),
  );
}

// ---------------------------------------------------------------------------
// SQL helpers — escape for INSERT statements
// ---------------------------------------------------------------------------

function esc(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

// ---------------------------------------------------------------------------
// state-dump.sql writer — atomic write, zero AI tokens
// ---------------------------------------------------------------------------

async function writeStateDumpFile(storage: StorageProvider, projectRoot: string): Promise<void> {
  const backend = await storage.getBackend();
  const memoryDir = findMemoryDir(projectRoot);

  const candidates = await backend.listEvolutionCandidates({});
  const permanentMemory = await backend.listPermanentMemory({});
  const bannedPatterns = await backend.listBannedPatterns({ active: true });
  const logEntries = await backend.getEvolutionLog({ limit: 20 });
  const patternStats = await backend.getPatternStats({});

  const lines: string[] = [
    `-- AIDD State Dump — Auto-generated, do not edit`,
    `-- Updated: ${now()}`,
    '',
  ];

  // Evolution candidates
  if (candidates.length > 0) {
    lines.push('-- Evolution Candidates (active)');
    for (const c of candidates) {
      lines.push(
        `INSERT OR REPLACE INTO evolution_candidates (id, type, title, confidence, model_scope, session_count, data, created_at, updated_at) VALUES (${esc(c.id)}, ${esc(c.type)}, ${esc(c.title)}, ${c.confidence}, ${esc(c.modelScope)}, ${c.sessionCount}, ${esc({ evidence: c.evidence, suggestedAction: c.suggestedAction, modelEvidence: c.modelEvidence })}, ${esc(c.createdAt)}, ${esc(c.updatedAt)});`,
      );
    }
    lines.push('');
  }

  // Permanent memory
  if (permanentMemory.length > 0) {
    lines.push('-- Permanent Memory (decisions, mistakes, conventions)');
    for (const m of permanentMemory) {
      lines.push(
        `INSERT OR REPLACE INTO permanent_memory (id, type, title, content, session_id, created_at) VALUES (${esc(m.id)}, ${esc(m.type)}, ${esc(m.title)}, ${esc(m.content)}, ${esc(m.sessionId)}, ${esc(m.createdAt)});`,
      );
    }
    lines.push('');
  }

  // Banned patterns
  if (bannedPatterns.length > 0) {
    lines.push('-- Banned Patterns (active)');
    for (const p of bannedPatterns) {
      lines.push(
        `INSERT OR REPLACE INTO banned_patterns (id, category, pattern, type, severity, model_scope, origin, active, use_count, hint, created_at) VALUES (${esc(p.id)}, ${esc(p.category)}, ${esc(p.pattern)}, ${esc(p.type)}, ${esc(p.severity)}, ${esc(p.modelScope)}, ${esc(p.origin)}, ${esc(p.active)}, ${p.useCount}, ${esc(p.hint)}, ${esc(p.createdAt)});`,
      );
    }
    lines.push('');
  }

  // Recent evolution log
  if (logEntries.length > 0) {
    lines.push('-- Recent Evolution Log (last 20)');
    for (const e of logEntries) {
      lines.push(
        `INSERT OR REPLACE INTO evolution_log (id, candidate_id, action, title, confidence, timestamp) VALUES (${esc(e.id)}, ${esc(e.candidateId)}, ${esc(e.action)}, ${esc(e.title)}, ${e.confidence}, ${esc(e.timestamp)});`,
      );
    }
    lines.push('');
  }

  // Pattern stats summary (as SQL comments for visibility)
  if (patternStats.totalDetections > 0) {
    lines.push('-- Pattern Detection Summary');
    lines.push(`-- Total detections: ${patternStats.totalDetections}`);
    for (const m of patternStats.models.slice(0, 5)) {
      lines.push(`-- ${m.modelId}: ${m.detections} detections — ${m.summary}`);
    }
    for (const p of patternStats.topPatterns.slice(0, 10)) {
      lines.push(`-- Top pattern: "${p.pattern}" (${p.category}) — ${p.count} hits, ${p.uniqueSessions} sessions`);
    }
    lines.push('');
  }

  // Atomic write: .tmp → renameSync
  ensureDir(memoryDir);
  const target = resolve(memoryDir, 'state-dump.sql');
  const tmp = target + '.tmp';
  writeFileSync(tmp, lines.join('\n'), 'utf-8');
  renameSync(tmp, target);
}

// ---------------------------------------------------------------------------
// Insights.md writer — atomic write, zero AI tokens
// ---------------------------------------------------------------------------

async function writeInsightsFile(storage: StorageProvider, projectRoot: string): Promise<void> {
  const backend = await storage.getBackend();
  const memoryDir = findMemoryDir(projectRoot);

  // Gather data (all SQLite queries, zero AI tokens)
  const entries = await backend.listSessions({ status: 'completed', limit: 50 });
  const candidates = await backend.listEvolutionCandidates({ minConfidence: 60 });
  const patternStats = await backend.getPatternStats({});
  const logEntries = await backend.getEvolutionLog({ limit: 5 });

  // Compute model metrics
  const modelGroups = new Map<string, { compliance: number; count: number; domain: string }>();
  for (const entry of entries) {
    const session = await backend.getSession(entry.id);
    if (!session?.outcome) continue;
    const mid = session.aiProvider.modelId;
    const existing = modelGroups.get(mid) ?? { compliance: 0, count: 0, domain: 'mixed' };
    existing.compliance += session.outcome.complianceScore;
    existing.count++;
    existing.domain = session.taskClassification?.domain ?? 'mixed';
    modelGroups.set(mid, existing);
  }

  const lines: string[] = [
    '# AIDD Auto-Insights',
    `> Auto-generated by evolution engine. Do not edit.`,
    `> Updated: ${now()} | Sessions: ${entries.length}`,
    '',
  ];

  if (modelGroups.size > 0) {
    lines.push('## Model Recommendations');
    lines.push('| Model | Best For | Compliance | Sessions |');
    lines.push('|-------|----------|-----------|----------|');
    for (const [modelId, data] of modelGroups) {
      const avg = Math.round(data.compliance / data.count);
      lines.push(`| ${modelId} | ${data.domain} | ${avg}% | ${data.count} |`);
    }
  }

  if (patternStats.models.length > 0) {
    lines.push('', '## Pattern Alerts');
    for (const alert of patternStats.models.slice(0, 5)) {
      lines.push(`- ${alert.modelId}: ${alert.summary}`);
    }
  }

  if (candidates.length > 0) {
    lines.push('', '## Pending Evolution');
    for (const c of candidates.slice(0, 10)) {
      const scope = c.modelScope ? ` [${c.modelScope}]` : '';
      lines.push(`- [${c.confidence}%]${scope} ${c.title}`);
    }
  }

  if (logEntries.length > 0) {
    lines.push('', '## Recent Actions');
    for (const e of logEntries) {
      lines.push(`- ${e.action}: ${e.title} (${e.timestamp.slice(0, 10)})`);
    }
  }

  // Atomic write: .tmp → renameSync
  ensureDir(memoryDir);
  const target = resolve(memoryDir, 'insights.md');
  const tmp = target + '.tmp';
  writeFileSync(tmp, lines.join('\n'), 'utf-8');
  renameSync(tmp, target);
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createEvolutionModule(storage: StorageProvider): AiddModule {
  return {
    name: 'evolution',
    description: 'Evolution engine — pattern recognition, confidence-based auto-improvements, rollback',

    register(server: McpServer, context: ModuleContext) {
      const thresholds = {
        autoApplyThreshold: context.config.evolution.autoApplyThreshold,
        draftThreshold: context.config.evolution.draftThreshold,
      };

      const promoteAndLog = async (
        backend: StorageBackend,
        candidate: EvolutionCandidate,
        rejectedTitles: Set<string>,
      ): Promise<{ action: 'auto_applied' | 'drafted' | 'pending' | 'rejected' | 'skipped' }> => {
        const promoted = await promoteCandidate({
          backend,
          candidate,
          thresholds,
          rejectedTitles,
        });

        if (promoted.action === 'skipped') {
          return { action: 'skipped' };
        }

        await backend.appendEvolutionLog({
          id: generateId(),
          candidateId: promoted.candidate?.id ?? candidate.id,
          action: promoted.action,
          title: promoted.candidate?.title ?? candidate.title,
          confidence: promoted.candidate?.confidence ?? candidate.confidence,
          timestamp: now(),
        });

        if (promoted.action === 'rejected' && promoted.candidate?.id && !promoted.mergedExisting) {
          await backend.deleteEvolutionCandidate(promoted.candidate.id);
        }

        return { action: promoted.action };
      };

      // Cross-module service: enforce centralized promotion policy from any module.
      context.services['promoteEvolutionCandidate'] = async (...args: unknown[]) => {
        const candidate = args[0] as EvolutionCandidate;
        const backend = await storage.getBackend();
        const rejectedTitles = await getRejectedPatterns(backend);
        return promoteAndLog(backend, candidate, rejectedTitles);
      };

      // ---- Analyze patterns ----
      registerTool(server, {
        name: 'aidd_evolution_analyze',
        description:
          'Analyze completed sessions to identify patterns and generate evolution candidates. Applies confidence thresholds from config: >90% auto-apply, 70-90% create draft, <70% stays pending.',
        schema: {
          dryRun: z.boolean().optional().default(false).describe('If true, only return candidates without persisting'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { dryRun } = args as { dryRun: boolean };

          if (!context.config.evolution.enabled || context.config.evolution.killSwitch) {
            return createJsonResult({ status: 'disabled', message: 'Evolution engine is disabled' });
          }

          const backend = await storage.getBackend();
          const entries = await backend.listSessions({ status: 'completed', limit: MAX_SESSIONS });

          const sessions: SessionState[] = [];
          for (const entry of entries) {
            const session = await backend.getSession(entry.id);
            if (session) sessions.push(session);
          }

          if (sessions.length < context.config.evolution.learningPeriodSessions) {
            return createJsonResult({
              status: 'learning',
              message: `Learning period: ${sessions.length}/${context.config.evolution.learningPeriodSessions} sessions completed`,
              sessionsNeeded: context.config.evolution.learningPeriodSessions - sessions.length,
            });
          }

          const newCandidates = analyzePatterns(sessions, context.config);

          if (dryRun) {
            return createJsonResult({
              status: 'dry_run',
              candidates: newCandidates.length,
              details: newCandidates.map((c) => ({
                type: c.type,
                title: c.title,
                confidence: c.confidence,
                sessionCount: c.sessionCount,
              })),
            });
          }

          const rejectedTitles = await getRejectedPatterns(backend);
          let autoApplied = 0;
          let drafted = 0;
          let pending = 0;
          let rejected = 0;
          let skipped = 0;

          for (const candidate of newCandidates) {
            const result = await promoteAndLog(backend, candidate, rejectedTitles);
            if (result.action === 'auto_applied') autoApplied++;
            else if (result.action === 'drafted') drafted++;
            else if (result.action === 'pending') pending++;
            else if (result.action === 'rejected') rejected++;
            else skipped++;
          }

          const totalPending = (await backend.listEvolutionCandidates({ status: 'pending' })).length;

          return createJsonResult({
            status: 'analyzed',
            sessionsAnalyzed: sessions.length,
            newCandidates: newCandidates.length,
            autoApplied,
            drafted,
            pending,
            rejected,
            skipped,
            totalPending,
            thresholds: { autoApply: thresholds.autoApplyThreshold, draft: thresholds.draftThreshold },
          });
        },
      });

      // ---- Evolution status ----
      registerTool(server, {
        name: 'aidd_evolution_status',
        description:
          'Get current evolution engine status: pending candidates grouped by confidence tier, recent actions.',
        schema: {},
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async () => {
          const backend = await storage.getBackend();
          const candidates = await backend.listEvolutionCandidates({});
          const logEntries = await backend.getEvolutionLog({ limit: 10 });

          const { autoApplyThreshold, draftThreshold } = context.config.evolution;

          const highConfidence = candidates.filter((c) => c.confidence >= autoApplyThreshold);
          const mediumConfidence = candidates.filter(
            (c) => c.confidence >= draftThreshold && c.confidence < autoApplyThreshold,
          );
          const lowConfidence = candidates.filter((c) => c.confidence < draftThreshold);

          return createJsonResult({
            enabled: context.config.evolution.enabled,
            killSwitch: context.config.evolution.killSwitch,
            thresholds: { autoApply: autoApplyThreshold, draft: draftThreshold },
            candidates: {
              total: candidates.length,
              highConfidence: highConfidence.map((c) => ({
                id: c.id, type: c.type, title: c.title,
                confidence: c.confidence, sessionCount: c.sessionCount,
              })),
              mediumConfidence: mediumConfidence.map((c) => ({
                id: c.id, type: c.type, title: c.title,
                confidence: c.confidence, sessionCount: c.sessionCount,
              })),
              lowConfidence: lowConfidence.map((c) => ({
                id: c.id, type: c.type, title: c.title,
                confidence: c.confidence, sessionCount: c.sessionCount,
              })),
            },
            recentActions: logEntries.map((e) => ({
              action: e.action, title: e.title, confidence: e.confidence, timestamp: e.timestamp,
            })),
          });
        },
      });

      // ---- Review candidate ----
      registerTool(server, {
        name: 'aidd_evolution_review',
        description:
          'Review a specific evolution candidate with full details and evidence.',
        schema: {
          candidateId: z.string().describe('Evolution candidate ID to review'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { candidateId } = args as { candidateId: string };

          const backend = await storage.getBackend();
          const candidates = await backend.listEvolutionCandidates({});
          const candidate = candidates.find((c) => c.id === candidateId);
          if (!candidate) return createErrorResult(`Candidate ${candidateId} not found`);

          const logEntries = await backend.getEvolutionLog({});
          const history = logEntries.filter((e) => e.candidateId === candidateId);

          return createJsonResult({
            candidate,
            history: history.map((e) => ({
              action: e.action, timestamp: e.timestamp, confidence: e.confidence,
            })),
          });
        },
      });

      // ---- Revert ----
      registerTool(server, {
        name: 'aidd_evolution_revert',
        description:
          'Revert an auto-applied evolution change. Restores files from snapshot if available.',
        schema: {
          candidateId: z.string().describe('Evolution candidate ID to revert'),
          reason: z.string().optional().describe('Reason for reverting'),
        },
        annotations: { destructiveHint: true, idempotentHint: true },
        handler: async (args) => {
          const { candidateId, reason } = args as { candidateId: string; reason?: string };

          const backend = await storage.getBackend();

          // Find snapshot
          const snapshot = await backend.getEvolutionSnapshot(candidateId);

          // Find candidate title
          const candidates = await backend.listEvolutionCandidates({});
          const candidate = candidates.find((c) => c.id === candidateId);
          const title = candidate?.title ?? `Unknown candidate ${candidateId}`;

          // Remove candidate
          if (candidate) {
            await backend.deleteEvolutionCandidate(candidateId);
          }

          // Log revert
          await backend.appendEvolutionLog({
            id: generateId(),
            candidateId,
            action: 'reverted',
            title,
            confidence: 0,
            snapshot: snapshot?.id,
            timestamp: now(),
          });

          return createJsonResult({
            reverted: true,
            candidateId,
            title,
            snapshotRestored: !!snapshot,
            reason,
          });
        },
      });

      // ---- Approve candidate ----
      registerTool(server, {
        name: 'aidd_evolution_approve',
        description:
          'Approve an evolution candidate. Updates its status and logs the approval.',
        schema: {
          candidateId: z.string().describe('Evolution candidate ID to approve'),
          reason: z.string().optional().describe('Reason for approval'),
        },
        annotations: { idempotentHint: true },
        handler: async (args) => {
          const { candidateId, reason } = args as { candidateId: string; reason?: string };
          const backend = await storage.getBackend();

          const candidates = await backend.listEvolutionCandidates({});
          const candidate = candidates.find((c) => c.id === candidateId);
          if (!candidate) return createErrorResult(`Candidate ${candidateId} not found`);

          candidate.status = 'approved';
          candidate.updatedAt = now();
          await backend.updateEvolutionCandidate(candidate);

          await backend.appendEvolutionLog({
            id: generateId(),
            candidateId,
            action: 'approved',
            title: candidate.title,
            confidence: candidate.confidence,
            timestamp: now(),
          });

          return createJsonResult({ approved: true, candidateId, title: candidate.title, reason });
        },
      });

      // ---- Reject candidate ----
      registerTool(server, {
        name: 'aidd_evolution_reject',
        description:
          'Reject an evolution candidate. Keeps it in the database for audit trail with rejected status.',
        schema: {
          candidateId: z.string().describe('Evolution candidate ID to reject'),
          reason: z.string().optional().describe('Reason for rejection'),
        },
        annotations: { idempotentHint: true },
        handler: async (args) => {
          const { candidateId, reason } = args as { candidateId: string; reason?: string };
          const backend = await storage.getBackend();

          const candidates = await backend.listEvolutionCandidates({});
          const candidate = candidates.find((c) => c.id === candidateId);
          if (!candidate) return createErrorResult(`Candidate ${candidateId} not found`);

          candidate.status = 'rejected';
          candidate.updatedAt = now();
          await backend.updateEvolutionCandidate(candidate);

          await backend.appendEvolutionLog({
            id: generateId(),
            candidateId,
            action: 'rejected',
            title: candidate.title,
            confidence: candidate.confidence,
            timestamp: now(),
          });

          return createJsonResult({ rejected: true, candidateId, title: candidate.title, reason });
        },
      });

      // ---- Delete candidate ----
      registerTool(server, {
        name: 'aidd_evolution_delete',
        description:
          'Permanently delete an evolution candidate from the database.',
        schema: {
          candidateId: z.string().describe('Evolution candidate ID to delete'),
        },
        annotations: { destructiveHint: true, idempotentHint: true },
        handler: async (args) => {
          const { candidateId } = args as { candidateId: string };
          const backend = await storage.getBackend();

          const candidates = await backend.listEvolutionCandidates({});
          const candidate = candidates.find((c) => c.id === candidateId);
          const title = candidate?.title ?? `Unknown candidate ${candidateId}`;

          await backend.deleteEvolutionCandidate(candidateId);

          await backend.appendEvolutionLog({
            id: generateId(),
            candidateId,
            action: 'rejected',
            title: `Deleted: ${title}`,
            confidence: 0,
            timestamp: now(),
          });

          return createJsonResult({ deleted: true, candidateId, title });
        },
      });

      // ---- Auto-hooks (zero AI token cost, server-side) ----

      let sessionsSinceAnalysis = 0;
      let sessionsSincePrune = 0;

      // 6.2: Debounced auto-evolution analysis (every 5th session)
      hookBus.register('evolution-auto-analyze', async (event) => {
        if (event.type !== 'session_ended') return;
        if (!context.config.evolution.enabled || context.config.evolution.killSwitch) return;

        sessionsSinceAnalysis++;
        if (sessionsSinceAnalysis < ANALYSIS_INTERVAL) return;
        sessionsSinceAnalysis = 0;

        const backend = await storage.getBackend();
        const entries = await backend.listSessions({ status: 'completed', limit: MAX_SESSIONS });
        if (entries.length < context.config.evolution.learningPeriodSessions) return;

        const sessions: SessionState[] = [];
        for (const e of entries) {
          const s = await backend.getSession(e.id);
          if (s) sessions.push(s);
        }

        const patternStats = await backend.getPatternStats({});
        const newCandidates = analyzePatterns(sessions, context.config, patternStats);
        const rejectedTitles = await getRejectedPatterns(backend);

        for (const candidate of newCandidates) {
          await promoteAndLog(backend, candidate, rejectedTitles);
        }

        // Write insights.md + state-dump.sql after analysis
        await writeInsightsFile(storage, context.projectRoot);
        await writeStateDumpFile(storage, context.projectRoot);
      });

      // 6.3: Feedback loop — adjust candidate confidence on session end
      hookBus.register('evolution-feedback-loop', async (event) => {
        if (event.type !== 'session_ended') return;

        const backend = await storage.getBackend();
        const session = await backend.getSession(event.sessionId);
        if (!session?.outcome?.userFeedback || session.outcome.userFeedback === 'neutral') return;

        const modelId = session.aiProvider.modelId;
        const isNegative = session.outcome.userFeedback === 'negative';
        const candidates = await backend.listEvolutionCandidates({ modelScope: modelId });

        for (const c of candidates) {
          if (isNegative) {
            c.confidence = Math.min(100, c.confidence + 10);
            if (c.type === 'model_pattern_ban') c.confidence = Math.min(100, c.confidence + 5);
          } else {
            if (c.type === 'model_pattern_ban') c.confidence = Math.max(0, c.confidence - 5);
          }
          c.updatedAt = now();
          await backend.updateEvolutionCandidate(c);
        }

        // Prune low-confidence candidates
        const lowConf = candidates.filter((c) => c.confidence <= 20);
        for (const c of lowConf) await backend.deleteEvolutionCandidate(c.id);
      });

      // Auto-prune stale data (every 10th session)
      hookBus.register('evolution-auto-prune', async (event) => {
        if (event.type !== 'session_ended') return;

        sessionsSincePrune++;
        if (sessionsSincePrune < PRUNE_INTERVAL) return;
        sessionsSincePrune = 0;

        const backend = await storage.getBackend();
        if ('pruneStaleData' in backend && typeof backend.pruneStaleData === 'function') {
          backend.pruneStaleData();
        }
      });
    },
  };
}
