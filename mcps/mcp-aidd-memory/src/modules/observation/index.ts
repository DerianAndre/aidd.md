import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  createErrorResult,
  generateId,
  now,
  stripPrivateTags,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ModuleContext, SessionObservation } from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageProvider } from '../../storage/index.js';
import { hookBus } from '../hooks.js';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createObservationModule(storage: StorageProvider): AiddModule {
  return {
    name: 'observation',
    description: 'Typed observation capture during sessions',

    register(server: McpServer, context: ModuleContext) {
      registerTool(server, {
        name: 'aidd_observation',
        description:
          'Record a typed observation during a session. Observations are indexed for 3-layer search. Types: decision, mistake, convention, pattern, preference, insight, tool_outcome, workflow_outcome.',
        schema: {
          sessionId: z.string().describe('Active session ID'),
          type: z
            .enum([
              'decision', 'mistake', 'convention', 'pattern',
              'preference', 'insight', 'tool_outcome', 'workflow_outcome',
            ])
            .describe('Observation type'),
          title: z.string().describe('Short title (used in search index)'),
          facts: z.array(z.string()).optional().describe('Key facts'),
          narrative: z.string().optional().describe('Detailed narrative'),
          concepts: z.array(z.string()).optional().describe('Related concepts'),
          filesRead: z.array(z.string()).optional().describe('Files read during observation'),
          filesModified: z.array(z.string()).optional().describe('Files modified'),
          discoveryTokens: z.number().optional().describe('Tokens spent on this discovery (ROI metric)'),
        },
        annotations: { idempotentHint: false },
        handler: async (args) => {
          const a = args as {
            sessionId: string;
            type: SessionObservation['type'];
            title: string;
            facts?: string[];
            narrative?: string;
            concepts?: string[];
            filesRead?: string[];
            filesModified?: string[];
            discoveryTokens?: number;
          };

          const backend = await storage.getBackend();

          // Verify session exists
          const session = await backend.getSession(a.sessionId);
          if (!session) return createErrorResult(`Session ${a.sessionId} not found`);

          const observation: SessionObservation = {
            id: generateId(),
            sessionId: a.sessionId,
            type: a.type,
            title: stripPrivateTags(a.title),
            facts: a.facts?.map(stripPrivateTags),
            narrative: a.narrative ? stripPrivateTags(a.narrative) : undefined,
            concepts: a.concepts?.map(stripPrivateTags),
            filesRead: a.filesRead,
            filesModified: a.filesModified,
            discoveryTokens: a.discoveryTokens,
            createdAt: now(),
          };

          await backend.saveObservation(observation);

          // Hook fires AFTER response — fire-and-forget with telemetry logging.
          hookBus.emit({
            type: 'observation_saved',
            observationId: observation.id,
            sessionId: observation.sessionId,
          }).catch((err) => {
            context.logger.error('HookBus emit failed (observation_saved):', err);
          });

          return createJsonResult({
            id: observation.id,
            type: observation.type,
            sessionId: observation.sessionId,
            saved: true,
          });
        },
      });
    },
  };
}
