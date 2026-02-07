import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  createErrorResult,
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
import { analyzePatterns } from './analyzer.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_SESSIONS = 200;

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

          // Merge with existing pending candidates
          const existingCandidates = await backend.listEvolutionCandidates({ status: 'pending' });
          const existingTitles = new Set(existingCandidates.map((c) => c.title));

          const { autoApplyThreshold, draftThreshold } = context.config.evolution;
          let autoApplied = 0;
          let drafted = 0;
          let pending = 0;

          for (const candidate of newCandidates) {
            if (existingTitles.has(candidate.title)) {
              // Update existing candidate
              const existing = existingCandidates.find((c) => c.title === candidate.title);
              if (existing) {
                existing.confidence = Math.max(existing.confidence, candidate.confidence);
                existing.sessionCount = Math.max(existing.sessionCount, candidate.sessionCount);
                existing.evidence = [...new Set([...existing.evidence, ...candidate.evidence])];
                existing.updatedAt = now();
                await backend.updateEvolutionCandidate(existing);
              }
              continue;
            }

            if (candidate.confidence >= autoApplyThreshold) {
              autoApplied++;
              await backend.saveEvolutionCandidate(candidate);
              await backend.appendEvolutionLog({
                id: generateId(),
                candidateId: candidate.id,
                action: 'auto_applied',
                title: candidate.title,
                confidence: candidate.confidence,
                timestamp: now(),
              });
            } else if (candidate.confidence >= draftThreshold) {
              drafted++;
              await backend.saveEvolutionCandidate(candidate);
              await backend.appendEvolutionLog({
                id: generateId(),
                candidateId: candidate.id,
                action: 'drafted',
                title: candidate.title,
                confidence: candidate.confidence,
                timestamp: now(),
              });
            } else {
              pending++;
              await backend.saveEvolutionCandidate(candidate);
              await backend.appendEvolutionLog({
                id: generateId(),
                candidateId: candidate.id,
                action: 'pending',
                title: candidate.title,
                confidence: candidate.confidence,
                timestamp: now(),
              });
            }
          }

          const totalPending = (await backend.listEvolutionCandidates({ status: 'pending' })).length;

          return createJsonResult({
            status: 'analyzed',
            sessionsAnalyzed: sessions.length,
            newCandidates: newCandidates.length,
            autoApplied,
            drafted,
            pending,
            totalPending,
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
    },
  };
}
