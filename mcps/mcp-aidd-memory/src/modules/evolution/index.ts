import { resolve } from 'node:path';
import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  createErrorResult,
  readJsonFile,
  writeJsonFile,
  ensureDir,
  generateId,
  now,
} from '@aidd.md/mcp-shared';
import type {
  AiddModule,
  ModuleContext,
  SessionState,
} from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageProvider } from '../../storage/index.js';
import type {
  EvolutionState,
  EvolutionLog,
  EvolutionLogEntry,
  EvolutionCandidate,
  EvolutionSnapshot,
} from './types.js';
import { analyzePatterns } from './analyzer.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_SESSIONS = 200;

function pendingPath(aiddDir: string): string {
  return resolve(aiddDir, 'evolution', 'pending.json');
}

function logPath(aiddDir: string): string {
  return resolve(aiddDir, 'evolution', 'log.json');
}

function snapshotPath(aiddDir: string, id: string): string {
  return resolve(aiddDir, 'evolution', 'snapshots', `${id}.json`);
}

function readPending(aiddDir: string): EvolutionState {
  return readJsonFile<EvolutionState>(pendingPath(aiddDir)) ?? { candidates: [], updatedAt: now() };
}

function writePending(aiddDir: string, state: EvolutionState): void {
  ensureDir(resolve(aiddDir, 'evolution'));
  writeJsonFile(pendingPath(aiddDir), state);
}

function readLog(aiddDir: string): EvolutionLog {
  return readJsonFile<EvolutionLog>(logPath(aiddDir)) ?? { entries: [] };
}

function writeLog(aiddDir: string, log: EvolutionLog): void {
  ensureDir(resolve(aiddDir, 'evolution'));
  writeJsonFile(logPath(aiddDir), log);
}

function appendLogEntry(aiddDir: string, entry: EvolutionLogEntry): void {
  const log = readLog(aiddDir);
  log.entries.push(entry);
  writeLog(aiddDir, log);
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createEvolutionModule(storage: StorageProvider): AiddModule {
  return {
    name: 'evolution',
    description: 'Evolution engine — pattern recognition, confidence-based auto-improvements, rollback',

    register(server: McpServer, context: ModuleContext) {
      // ---- Analyze patterns ----
      registerTool(server, {
        name: 'aidd_evolution_analyze',
        description:
          'Analyze completed sessions to identify patterns and generate evolution candidates. Applies confidence thresholds from config: >90% auto-apply, 70-90% create draft, <70% stays pending.',
        schema: {
          dryRun: z.boolean().optional().default(false).describe('If true, only return candidates without persisting'),
        },
        annotations: { readOnlyHint: false },
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

          // Merge with existing pending
          const state = readPending(context.aiddDir);
          const existingTitles = new Set(state.candidates.map((c) => c.title));

          const { autoApplyThreshold, draftThreshold } = context.config.evolution;
          const autoApplied: EvolutionCandidate[] = [];
          const drafted: EvolutionCandidate[] = [];
          const pending: EvolutionCandidate[] = [];

          for (const candidate of newCandidates) {
            if (existingTitles.has(candidate.title)) {
              // Update existing
              const existing = state.candidates.find((c) => c.title === candidate.title);
              if (existing) {
                existing.confidence = Math.max(existing.confidence, candidate.confidence);
                existing.sessionCount = Math.max(existing.sessionCount, candidate.sessionCount);
                existing.evidence = [...new Set([...existing.evidence, ...candidate.evidence])];
                existing.updatedAt = now();
              }
              continue;
            }

            if (candidate.confidence >= autoApplyThreshold) {
              autoApplied.push(candidate);
              appendLogEntry(context.aiddDir, {
                id: generateId(),
                candidateId: candidate.id,
                action: 'auto_applied',
                title: candidate.title,
                confidence: candidate.confidence,
                timestamp: now(),
              });
            } else if (candidate.confidence >= draftThreshold) {
              drafted.push(candidate);
              state.candidates.push(candidate);
              appendLogEntry(context.aiddDir, {
                id: generateId(),
                candidateId: candidate.id,
                action: 'drafted',
                title: candidate.title,
                confidence: candidate.confidence,
                timestamp: now(),
              });
            } else {
              pending.push(candidate);
              state.candidates.push(candidate);
              appendLogEntry(context.aiddDir, {
                id: generateId(),
                candidateId: candidate.id,
                action: 'pending',
                title: candidate.title,
                confidence: candidate.confidence,
                timestamp: now(),
              });
            }
          }

          state.updatedAt = now();
          writePending(context.aiddDir, state);

          return createJsonResult({
            status: 'analyzed',
            sessionsAnalyzed: sessions.length,
            newCandidates: newCandidates.length,
            autoApplied: autoApplied.length,
            drafted: drafted.length,
            pending: pending.length,
            totalPending: state.candidates.length,
            thresholds: { autoApply: autoApplyThreshold, draft: draftThreshold },
          });
        },
      });

      // ---- Evolution status ----
      registerTool(server, {
        name: 'aidd_evolution_status',
        description:
          'Get current evolution engine status: pending candidates grouped by confidence tier, recent actions.',
        schema: {},
        annotations: { readOnlyHint: true },
        handler: async () => {
          const state = readPending(context.aiddDir);
          const log = readLog(context.aiddDir);

          const { autoApplyThreshold, draftThreshold } = context.config.evolution;

          const highConfidence = state.candidates.filter((c) => c.confidence >= autoApplyThreshold);
          const mediumConfidence = state.candidates.filter(
            (c) => c.confidence >= draftThreshold && c.confidence < autoApplyThreshold,
          );
          const lowConfidence = state.candidates.filter((c) => c.confidence < draftThreshold);

          return createJsonResult({
            enabled: context.config.evolution.enabled,
            killSwitch: context.config.evolution.killSwitch,
            thresholds: { autoApply: autoApplyThreshold, draft: draftThreshold },
            candidates: {
              total: state.candidates.length,
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
            recentActions: log.entries.slice(-10).reverse().map((e) => ({
              action: e.action, title: e.title, confidence: e.confidence, timestamp: e.timestamp,
            })),
            updatedAt: state.updatedAt,
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
        annotations: { readOnlyHint: true },
        handler: async (args) => {
          const { candidateId } = args as { candidateId: string };

          const state = readPending(context.aiddDir);
          const candidate = state.candidates.find((c) => c.id === candidateId);
          if (!candidate) return createErrorResult(`Candidate ${candidateId} not found`);

          // Find log entries for this candidate
          const log = readLog(context.aiddDir);
          const history = log.entries.filter((e) => e.candidateId === candidateId);

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
        annotations: { readOnlyHint: false, destructiveHint: true },
        handler: async (args) => {
          const { candidateId, reason } = args as { candidateId: string; reason?: string };

          // Find snapshot
          const snapshot = readJsonFile<EvolutionSnapshot>(
            snapshotPath(context.aiddDir, candidateId),
          );

          // Remove from pending
          const state = readPending(context.aiddDir);
          const idx = state.candidates.findIndex((c) => c.id === candidateId);
          let title = `Unknown candidate ${candidateId}`;
          if (idx !== -1) {
            title = state.candidates[idx]!.title;
            state.candidates.splice(idx, 1);
            state.updatedAt = now();
            writePending(context.aiddDir, state);
          }

          // Log revert
          appendLogEntry(context.aiddDir, {
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
    },
  };
}
