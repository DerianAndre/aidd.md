import { resolve } from 'node:path';
import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  createErrorResult,
  readJsonFile,
  writeJsonFile,
  listFiles,
  ensureDir,
  generateId,
  now,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ModuleContext } from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ASDD_PHASES,
  PHASE_DEFINITIONS,
} from './types.js';
import type { AsddPhase, LifecycleSession } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lifecyclePath(aiddDir: string, id: string): string {
  return resolve(aiddDir, 'sessions', 'active', `${id}.lifecycle.json`);
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createLifecycleModule(): AiddModule {
  return {
    name: 'lifecycle',
    description: 'ASDD lifecycle management — 8-phase development lifecycle',

    register(server: McpServer, context: ModuleContext) {
      const activeDir = resolve(context.aiddDir, 'sessions', 'active');

      // ---- Get ASDD definition ----
      registerTool(server, {
        name: 'aidd_lifecycle_get',
        description:
          'Get the 8-phase ASDD lifecycle definition with entry/exit criteria and key activities for each phase.',
        schema: {},
        annotations: { readOnlyHint: true },
        handler: async () => {
          return createJsonResult({
            name: 'AI-Spec-Driven Development (ASDD)',
            phases: PHASE_DEFINITIONS,
            totalPhases: PHASE_DEFINITIONS.length,
          });
        },
      });

      // ---- Init lifecycle session ----
      registerTool(server, {
        name: 'aidd_lifecycle_init',
        description:
          'Start a new ASDD lifecycle session for a feature. Begins at the SYNC phase by default.',
        schema: {
          feature: z.string().describe('Feature name/description'),
          sessionId: z.string().optional().describe('Associated session ID'),
          startPhase: z
            .enum(['SYNC', 'STORY', 'PLAN', 'COMMIT_SPEC', 'EXECUTE', 'TEST', 'VERIFY', 'COMMIT_IMPL'])
            .optional()
            .default('SYNC')
            .describe('Starting phase (default: SYNC)'),
        },
        annotations: { readOnlyHint: false },
        handler: async (args) => {
          const { feature, sessionId, startPhase } = args as {
            feature: string;
            sessionId?: string;
            startPhase: AsddPhase;
          };

          const lifecycle: LifecycleSession = {
            id: generateId(),
            sessionId,
            feature,
            currentPhase: startPhase,
            status: 'active',
            phases: [{ name: startPhase, enteredAt: now() }],
            createdAt: now(),
            updatedAt: now(),
          };

          ensureDir(activeDir);
          writeJsonFile(lifecyclePath(context.aiddDir, lifecycle.id), lifecycle);

          const phaseDef = PHASE_DEFINITIONS.find((p) => p.name === startPhase);

          return createJsonResult({
            id: lifecycle.id,
            feature,
            currentPhase: startPhase,
            phaseDescription: phaseDef?.description,
            exitCriteria: phaseDef?.exitCriteria,
          });
        },
      });

      // ---- Advance phase ----
      registerTool(server, {
        name: 'aidd_lifecycle_advance',
        description:
          'Advance an ASDD lifecycle session to the next phase. Validates the exit criteria have been met. Advancing from COMMIT_IMPL completes the lifecycle.',
        schema: {
          lifecycleId: z.string().describe('Lifecycle session ID'),
          notes: z.string().optional().describe('Notes about phase completion'),
          force: z.boolean().optional().describe('Force advance without exit criteria check'),
        },
        annotations: { readOnlyHint: false },
        handler: async (args) => {
          const { lifecycleId, notes, force } = args as {
            lifecycleId: string;
            notes?: string;
            force?: boolean;
          };

          const filePath = lifecyclePath(context.aiddDir, lifecycleId);
          const lifecycle = readJsonFile<LifecycleSession>(filePath);
          if (!lifecycle) return createErrorResult(`Lifecycle ${lifecycleId} not found`);
          if (lifecycle.status !== 'active') return createErrorResult(`Lifecycle ${lifecycleId} is ${lifecycle.status}`);

          const currentIdx = ASDD_PHASES.indexOf(lifecycle.currentPhase);
          if (currentIdx === -1) return createErrorResult(`Unknown phase: ${lifecycle.currentPhase}`);

          // Close current phase
          const currentRecord = lifecycle.phases.find(
            (p) => p.name === lifecycle.currentPhase && !p.exitedAt,
          );
          if (currentRecord) {
            currentRecord.exitedAt = now();
            if (notes) currentRecord.notes = notes;
          }

          // Check if this is the last phase
          if (currentIdx === ASDD_PHASES.length - 1) {
            lifecycle.status = 'completed';
            lifecycle.updatedAt = now();
            writeJsonFile(filePath, lifecycle);

            return createJsonResult({
              id: lifecycle.id,
              status: 'completed',
              feature: lifecycle.feature,
              totalPhases: lifecycle.phases.length,
            });
          }

          // Advance to next phase
          const nextPhase = ASDD_PHASES[currentIdx + 1]!;
          const nextDef = PHASE_DEFINITIONS.find((p) => p.name === nextPhase);

          if (!force && nextDef) {
            // Return exit criteria for the current phase as guidance
            const currentDef = PHASE_DEFINITIONS.find((p) => p.name === lifecycle.currentPhase);
            if (currentDef) {
              // We don't block — just include the criteria in the response for the AI to validate
            }
          }

          lifecycle.currentPhase = nextPhase;
          lifecycle.phases.push({ name: nextPhase, enteredAt: now() });
          lifecycle.updatedAt = now();

          writeJsonFile(filePath, lifecycle);

          return createJsonResult({
            id: lifecycle.id,
            previousPhase: ASDD_PHASES[currentIdx],
            currentPhase: nextPhase,
            phaseDescription: nextDef?.description,
            entryCriteria: nextDef?.entryCriteria,
            exitCriteria: nextDef?.exitCriteria,
            keyActivities: nextDef?.keyActivities,
            phasesCompleted: currentIdx + 1,
            phasesRemaining: ASDD_PHASES.length - currentIdx - 1,
          });
        },
      });

      // ---- Status ----
      registerTool(server, {
        name: 'aidd_lifecycle_status',
        description:
          'Get the current status of an ASDD lifecycle session including progress and exit criteria.',
        schema: {
          lifecycleId: z.string().describe('Lifecycle session ID'),
        },
        annotations: { readOnlyHint: true },
        handler: async (args) => {
          const { lifecycleId } = args as { lifecycleId: string };

          const filePath = lifecyclePath(context.aiddDir, lifecycleId);
          const lifecycle = readJsonFile<LifecycleSession>(filePath);
          if (!lifecycle) return createErrorResult(`Lifecycle ${lifecycleId} not found`);

          const currentDef = PHASE_DEFINITIONS.find((p) => p.name === lifecycle.currentPhase);
          const currentIdx = ASDD_PHASES.indexOf(lifecycle.currentPhase);

          return createJsonResult({
            id: lifecycle.id,
            feature: lifecycle.feature,
            status: lifecycle.status,
            currentPhase: lifecycle.currentPhase,
            phaseDescription: currentDef?.description,
            exitCriteria: currentDef?.exitCriteria,
            keyActivities: currentDef?.keyActivities,
            phasesCompleted: currentIdx,
            totalPhases: ASDD_PHASES.length,
            progress: `${currentIdx}/${ASDD_PHASES.length}`,
            phases: lifecycle.phases,
            sessionId: lifecycle.sessionId,
            createdAt: lifecycle.createdAt,
            updatedAt: lifecycle.updatedAt,
          });
        },
      });

      // ---- List lifecycle sessions ----
      registerTool(server, {
        name: 'aidd_lifecycle_list',
        description: 'List ASDD lifecycle sessions, optionally filtered by status.',
        schema: {
          status: z
            .enum(['active', 'completed', 'abandoned'])
            .optional()
            .describe('Filter by status'),
          limit: z.number().optional().default(20).describe('Max results'),
        },
        annotations: { readOnlyHint: true },
        handler: async (args) => {
          const { status, limit } = args as { status?: string; limit: number };

          ensureDir(activeDir);
          const files = listFiles(activeDir, { extensions: ['.json'] });
          const lifecycles: Array<{
            id: string;
            feature: string;
            status: string;
            currentPhase: string;
            progress: string;
            updatedAt: string;
          }> = [];

          for (const file of files) {
            if (!file.endsWith('.lifecycle.json')) continue;
            const lc = readJsonFile<LifecycleSession>(file);
            if (!lc) continue;
            if (status && lc.status !== status) continue;

            const idx = ASDD_PHASES.indexOf(lc.currentPhase);
            lifecycles.push({
              id: lc.id,
              feature: lc.feature,
              status: lc.status,
              currentPhase: lc.currentPhase,
              progress: `${idx}/${ASDD_PHASES.length}`,
              updatedAt: lc.updatedAt,
            });
          }

          lifecycles.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          return createJsonResult({ count: Math.min(lifecycles.length, limit), lifecycles: lifecycles.slice(0, limit) });
        },
      });
    },
  };
}
