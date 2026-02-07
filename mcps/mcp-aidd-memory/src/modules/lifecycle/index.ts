import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  createErrorResult,
  generateId,
  now,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ModuleContext, LifecycleSession } from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageProvider } from '../../storage/index.js';
import {
  AIDD_PHASES,
  PHASE_DEFINITIONS,
} from './types.js';
import type { AiddPhase } from './types.js';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createLifecycleModule(storage: StorageProvider): AiddModule {
  return {
    name: 'lifecycle',
    description: 'AIDD lifecycle management — 6-phase development lifecycle',

    register(server: McpServer, _context: ModuleContext) {
      // ---- Get AIDD definition ----
      registerTool(server, {
        name: 'aidd_lifecycle_get',
        description:
          'Get the 6-phase AIDD lifecycle definition with entry/exit criteria and key activities for each phase.',
        schema: {},
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async () => {
          return createJsonResult({
            name: 'AI-Driven Development (AIDD)',
            phases: PHASE_DEFINITIONS,
            totalPhases: PHASE_DEFINITIONS.length,
          });
        },
      });

      // ---- Init lifecycle session ----
      registerTool(server, {
        name: 'aidd_lifecycle_init',
        description:
          'Start a new AIDD lifecycle session for a feature. Begins at the UNDERSTAND phase by default.',
        schema: {
          feature: z.string().describe('Feature name/description'),
          sessionId: z.string().optional().describe('Associated session ID'),
          startPhase: z
            .enum(['UNDERSTAND', 'PLAN', 'SPEC', 'BUILD', 'VERIFY', 'SHIP'])
            .optional()
            .default('UNDERSTAND')
            .describe('Starting phase (default: UNDERSTAND)'),
        },
        annotations: { idempotentHint: false },
        handler: async (args) => {
          const { feature, sessionId, startPhase } = args as {
            feature: string;
            sessionId?: string;
            startPhase: AiddPhase;
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

          const backend = await storage.getBackend();
          await backend.saveLifecycle(lifecycle);

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
          'Advance an AIDD lifecycle session to the next phase. Validates the exit criteria have been met. Advancing from SHIP completes the lifecycle.',
        schema: {
          lifecycleId: z.string().describe('Lifecycle session ID'),
          notes: z.string().optional().describe('Notes about phase completion'),
          force: z.boolean().optional().describe('Force advance without exit criteria check'),
        },
        annotations: { idempotentHint: false },
        handler: async (args) => {
          const { lifecycleId, notes } = args as {
            lifecycleId: string;
            notes?: string;
            force?: boolean;
          };

          const backend = await storage.getBackend();
          const lifecycle = await backend.getLifecycle(lifecycleId);
          if (!lifecycle) return createErrorResult(`Lifecycle ${lifecycleId} not found`);
          if (lifecycle.status !== 'active') return createErrorResult(`Lifecycle ${lifecycleId} is ${lifecycle.status}`);

          const currentIdx = AIDD_PHASES.indexOf(lifecycle.currentPhase);
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
          if (currentIdx === AIDD_PHASES.length - 1) {
            lifecycle.status = 'completed';
            lifecycle.updatedAt = now();
            await backend.saveLifecycle(lifecycle);

            return createJsonResult({
              id: lifecycle.id,
              status: 'completed',
              feature: lifecycle.feature,
              totalPhases: lifecycle.phases.length,
            });
          }

          // Advance to next phase
          const nextPhase = AIDD_PHASES[currentIdx + 1]!;
          const nextDef = PHASE_DEFINITIONS.find((p) => p.name === nextPhase);

          lifecycle.currentPhase = nextPhase;
          lifecycle.phases.push({ name: nextPhase, enteredAt: now() });
          lifecycle.updatedAt = now();

          await backend.saveLifecycle(lifecycle);

          return createJsonResult({
            id: lifecycle.id,
            previousPhase: AIDD_PHASES[currentIdx],
            currentPhase: nextPhase,
            phaseDescription: nextDef?.description,
            entryCriteria: nextDef?.entryCriteria,
            exitCriteria: nextDef?.exitCriteria,
            keyActivities: nextDef?.keyActivities,
            phasesCompleted: currentIdx + 1,
            phasesRemaining: AIDD_PHASES.length - currentIdx - 1,
          });
        },
      });

      // ---- Status ----
      registerTool(server, {
        name: 'aidd_lifecycle_status',
        description:
          'Get the current status of an AIDD lifecycle session including progress and exit criteria.',
        schema: {
          lifecycleId: z.string().describe('Lifecycle session ID'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { lifecycleId } = args as { lifecycleId: string };

          const backend = await storage.getBackend();
          const lifecycle = await backend.getLifecycle(lifecycleId);
          if (!lifecycle) return createErrorResult(`Lifecycle ${lifecycleId} not found`);

          const currentDef = PHASE_DEFINITIONS.find((p) => p.name === lifecycle.currentPhase);
          const currentIdx = AIDD_PHASES.indexOf(lifecycle.currentPhase);

          return createJsonResult({
            id: lifecycle.id,
            feature: lifecycle.feature,
            status: lifecycle.status,
            currentPhase: lifecycle.currentPhase,
            phaseDescription: currentDef?.description,
            exitCriteria: currentDef?.exitCriteria,
            keyActivities: currentDef?.keyActivities,
            phasesCompleted: currentIdx,
            totalPhases: AIDD_PHASES.length,
            progress: `${currentIdx}/${AIDD_PHASES.length}`,
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
        description: 'List AIDD lifecycle sessions, optionally filtered by status.',
        schema: {
          status: z
            .enum(['active', 'completed', 'abandoned'])
            .optional()
            .describe('Filter by status'),
          limit: z.number().optional().default(20).describe('Max results'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { status, limit } = args as { status?: string; limit: number };

          const backend = await storage.getBackend();
          const lifecycles = await backend.listLifecycles({ status, limit });

          return createJsonResult({
            count: lifecycles.length,
            lifecycles: lifecycles.map((lc) => {
              const idx = AIDD_PHASES.indexOf(lc.currentPhase);
              return {
                id: lc.id,
                feature: lc.feature,
                status: lc.status,
                currentPhase: lc.currentPhase,
                progress: `${idx}/${AIDD_PHASES.length}`,
                updatedAt: lc.updatedAt,
              };
            }),
          });
        },
      });
    },
  };
}
