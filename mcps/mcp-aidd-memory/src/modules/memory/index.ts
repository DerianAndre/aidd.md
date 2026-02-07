import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  createErrorResult,
  generateId,
  now,
  stripPrivateTags,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ModuleContext } from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageProvider } from '../../storage/index.js';
import {
  findMemoryDir,
  decisionToEntry,
  mistakeToEntry,
  entryToMistake,
  conventionToEntry,
  exportPermanentMemoryToJson,
} from './permanent-memory.js';
import type { DecisionEntry, MistakeEntry, ConventionEntry } from './permanent-memory.js';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createMemoryModule(storage: StorageProvider): AiddModule {
  return {
    name: 'memory',
    description: '3-layer memory search + permanent memory CRUD (decisions, mistakes, conventions)',

    register(server: McpServer, context: ModuleContext) {
      const memoryDir = findMemoryDir(context.projectRoot);

      // ---- Layer 1: Search (compact index) ----
      registerTool(server, {
        name: 'aidd_memory_search',
        description:
          'Search memory for observations, decisions, mistakes, conventions. Returns compact index entries (~50-100 tokens each). Use aidd_memory_context for timeline, aidd_memory_get for full details.',
        schema: {
          query: z.string().describe('Search query'),
          type: z
            .enum(['decision', 'mistake', 'convention', 'pattern', 'preference', 'insight', 'tool_outcome', 'workflow_outcome'])
            .optional()
            .describe('Filter by observation type'),
          sessionId: z.string().optional().describe('Filter by session ID'),
          limit: z.number().optional().default(20).describe('Max results'),
          orderBy: z
            .enum(['relevance', 'date_asc', 'date_desc'])
            .optional()
            .default('relevance')
            .describe('Sort order'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { query, type, sessionId, limit, orderBy } = args as {
            query: string;
            type?: string;
            sessionId?: string;
            limit: number;
            orderBy: string;
          };

          const backend = await storage.getBackend();
          const results = await backend.search(query, {
            type: type as never,
            sessionId,
            limit,
            orderBy: orderBy as 'relevance' | 'date_asc' | 'date_desc',
          });

          return createJsonResult({ count: results.length, results });
        },
      });

      // ---- Layer 2: Timeline context ----
      registerTool(server, {
        name: 'aidd_memory_context',
        description:
          'Get timeline context around a memory entry. Returns the anchor entry plus entries before and after it chronologically.',
        schema: {
          anchor: z.string().describe('Observation/entry ID to center timeline on'),
          depth: z.number().optional().default(3).describe('Number of entries before and after'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { anchor, depth } = args as { anchor: string; depth: number };
          const backend = await storage.getBackend();
          const timeline = await backend.getTimeline(anchor, depth);
          return createJsonResult(timeline);
        },
      });

      // ---- Layer 3: Full details by IDs ----
      registerTool(server, {
        name: 'aidd_memory_get',
        description:
          'Get full details for specific memory entries by ID. Returns complete content (~500-1000 tokens each). Use after search/context to retrieve selected entries.',
        schema: {
          ids: z.array(z.string()).describe('Array of entry IDs to retrieve'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { ids } = args as { ids: string[] };
          const backend = await storage.getBackend();
          const entries = await backend.getByIds(ids);
          return createJsonResult({ count: entries.length, entries });
        },
      });

      // ---- Permanent memory CRUD ----

      registerTool(server, {
        name: 'aidd_memory_add_decision',
        description:
          'Record a permanent decision. Stored in SQLite; export to .aidd/memory/decisions.json via aidd_memory_export.',
        schema: {
          decision: z.string().describe('The decision made'),
          reasoning: z.string().describe('Why this decision was made'),
          alternatives: z.array(z.string()).optional().describe('Alternatives considered'),
          context: z.string().optional().describe('Additional context'),
          sessionId: z.string().optional().describe('Associated session ID'),
        },
        annotations: { idempotentHint: true },
        handler: async (args) => {
          const a = args as {
            decision: string;
            reasoning: string;
            alternatives?: string[];
            context?: string;
            sessionId?: string;
          };

          const entry: DecisionEntry = {
            id: generateId(),
            decision: stripPrivateTags(a.decision),
            reasoning: stripPrivateTags(a.reasoning),
            alternatives: a.alternatives?.map(stripPrivateTags),
            context: a.context ? stripPrivateTags(a.context) : undefined,
            createdAt: now(),
            sessionId: a.sessionId,
          };

          const backend = await storage.getBackend();
          await backend.savePermanentMemory(decisionToEntry(entry));

          return createJsonResult({ id: entry.id, type: 'decision', saved: true });
        },
      });

      registerTool(server, {
        name: 'aidd_memory_add_mistake',
        description:
          'Record a mistake/error and its fix. Checks for duplicates by error text. Stored in SQLite; export via aidd_memory_export.',
        schema: {
          error: z.string().describe('The error encountered'),
          rootCause: z.string().describe('Root cause analysis'),
          fix: z.string().describe('How it was fixed'),
          prevention: z.string().describe('How to prevent in the future'),
          sessionId: z.string().optional().describe('Associated session ID'),
        },
        annotations: { idempotentHint: true },
        handler: async (args) => {
          const a = args as {
            error: string;
            rootCause: string;
            fix: string;
            prevention: string;
            sessionId?: string;
          };

          const backend = await storage.getBackend();
          const existing = await backend.listPermanentMemory({ type: 'mistake' });

          // Check for duplicates by error text similarity
          const errorLower = a.error.toLowerCase();
          for (const e of existing) {
            if (e.title.toLowerCase() === errorLower) {
              // Update existing mistake: increment occurrences, update fix/prevention
              const mistake = entryToMistake(e);
              mistake.occurrences += 1;
              mistake.lastSeenAt = now();
              mistake.fix = stripPrivateTags(a.fix);
              mistake.prevention = stripPrivateTags(a.prevention);
              await backend.savePermanentMemory(mistakeToEntry(mistake));
              return createJsonResult({
                id: mistake.id,
                type: 'mistake',
                saved: true,
                duplicate: true,
                occurrences: mistake.occurrences,
              });
            }
          }

          const entry: MistakeEntry = {
            id: generateId(),
            error: stripPrivateTags(a.error),
            rootCause: stripPrivateTags(a.rootCause),
            fix: stripPrivateTags(a.fix),
            prevention: stripPrivateTags(a.prevention),
            occurrences: 1,
            createdAt: now(),
            lastSeenAt: now(),
            sessionId: a.sessionId,
          };

          await backend.savePermanentMemory(mistakeToEntry(entry));

          return createJsonResult({ id: entry.id, type: 'mistake', saved: true, duplicate: false });
        },
      });

      registerTool(server, {
        name: 'aidd_memory_add_convention',
        description:
          'Record a project convention. Stored in SQLite; export to .aidd/memory/conventions.json via aidd_memory_export.',
        schema: {
          convention: z.string().describe('The convention to follow'),
          example: z.string().describe('Example of the convention in practice'),
          rationale: z.string().optional().describe('Why this convention exists'),
          sessionId: z.string().optional().describe('Associated session ID'),
        },
        annotations: { idempotentHint: true },
        handler: async (args) => {
          const a = args as {
            convention: string;
            example: string;
            rationale?: string;
            sessionId?: string;
          };

          const entry: ConventionEntry = {
            id: generateId(),
            convention: stripPrivateTags(a.convention),
            example: stripPrivateTags(a.example),
            rationale: a.rationale ? stripPrivateTags(a.rationale) : undefined,
            createdAt: now(),
            sessionId: a.sessionId,
          };

          const backend = await storage.getBackend();
          await backend.savePermanentMemory(conventionToEntry(entry));

          return createJsonResult({ id: entry.id, type: 'convention', saved: true });
        },
      });

      registerTool(server, {
        name: 'aidd_memory_prune',
        description:
          'Remove a permanent memory entry by ID and type. Removes from SQLite and search index.',
        schema: {
          type: z.enum(['decision', 'mistake', 'convention']).describe('Type of entry to remove'),
          id: z.string().describe('Entry ID to remove'),
        },
        annotations: { destructiveHint: true, idempotentHint: true },
        handler: async (args) => {
          const { type, id } = args as { type: string; id: string };
          const backend = await storage.getBackend();

          const entry = await backend.getPermanentMemory(id);
          if (!entry || entry.type !== type) {
            return createErrorResult(`Entry ${id} of type ${type} not found`);
          }

          await backend.deletePermanentMemory(id);
          return createJsonResult({ id, type, removed: true });
        },
      });

      // ---- Export: SQLite → JSON files ----
      registerTool(server, {
        name: 'aidd_memory_export',
        description:
          'Export permanent memory from SQLite to JSON files in .aidd/memory/ (decisions.json, mistakes.json, conventions.json). For Git visibility and team sharing.',
        schema: {},
        annotations: { idempotentHint: true },
        handler: async () => {
          const backend = await storage.getBackend();
          const result = await exportPermanentMemoryToJson(backend, memoryDir);
          return createJsonResult({
            exported: true,
            directory: memoryDir,
            ...result,
          });
        },
      });
    },
  };
}
