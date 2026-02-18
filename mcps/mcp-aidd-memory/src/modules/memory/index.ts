import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  createErrorResult,
  generateId,
  now,
  stripPrivateTags,
  createLogger,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ModuleContext } from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageProvider } from '../../storage/index.js';
import {
  findMemoryDir,
  decisionToEntry,
  entryToDecision,
  mistakeToEntry,
  entryToMistake,
  conventionToEntry,
  entryToConvention,
  exportPermanentMemoryToJson,
} from './permanent-memory.js';
import type { DecisionEntry, MistakeEntry, ConventionEntry } from './permanent-memory.js';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const logger = createLogger('memory');

export function createMemoryModule(storage: StorageProvider): AiddModule {
  return {
    name: 'memory',
    description: '3-layer memory search + permanent memory CRUD (decisions, mistakes, conventions)',

    register(server: McpServer, context: ModuleContext) {
      const memoryDir = findMemoryDir(context.projectRoot);

      // ---- Cross-module service: PAPI (queryDomainMistakes) ----
      context.services['queryDomainMistakes'] = async (...args: unknown[]) => {
        const domain = args[0] as string;
        const limit = (args[1] as number) ?? 3;
        const backend = await storage.getBackend();
        const mistakes = await backend.listPermanentMemory({ type: 'mistake' });
        const domainLower = domain.toLowerCase();
        return mistakes
          .filter((m) => {
            try {
              const content = JSON.parse(m.content) as Record<string, string>;
              return m.title.toLowerCase().includes(domainLower) ||
                (content['rootCause'] ?? '').toLowerCase().includes(domainLower);
            } catch { return false; }
          })
          .sort((a, b) => {
            const aOcc = (JSON.parse(a.content) as Record<string, number>)['occurrences'] ?? 1;
            const bOcc = (JSON.parse(b.content) as Record<string, number>)['occurrences'] ?? 1;
            return bOcc - aOcc;
          })
          .slice(0, limit)
          .map((m) => {
            const content = JSON.parse(m.content) as Record<string, string>;
            return { error: m.title, fix: content['fix'] ?? content['prevention'] ?? '' };
          });
      };

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

      // ---- Permanent memory EDIT ----

      registerTool(server, {
        name: 'aidd_memory_edit_decision',
        description:
          'Edit an existing permanent decision. Updates only the provided fields, preserving the rest.',
        schema: {
          id: z.string().describe('Decision entry ID'),
          decision: z.string().optional().describe('Updated decision text'),
          reasoning: z.string().optional().describe('Updated reasoning'),
          alternatives: z.array(z.string()).optional().describe('Updated alternatives'),
          context: z.string().optional().describe('Updated context'),
        },
        annotations: { idempotentHint: true },
        handler: async (args) => {
          const a = args as {
            id: string;
            decision?: string;
            reasoning?: string;
            alternatives?: string[];
            context?: string;
          };

          const backend = await storage.getBackend();
          const entry = await backend.getPermanentMemory(a.id);
          if (!entry) return createErrorResult(`Entry ${a.id} not found`);
          if (entry.type !== 'decision') return createErrorResult(`Entry ${a.id} is type '${entry.type}', not 'decision'`);

          const existing = entryToDecision(entry);
          if (a.decision !== undefined) existing.decision = stripPrivateTags(a.decision);
          if (a.reasoning !== undefined) existing.reasoning = stripPrivateTags(a.reasoning);
          if (a.alternatives !== undefined) existing.alternatives = a.alternatives.map(stripPrivateTags);
          if (a.context !== undefined) existing.context = stripPrivateTags(a.context);

          await backend.savePermanentMemory(decisionToEntry(existing));
          return createJsonResult({ id: a.id, type: 'decision', updated: true });
        },
      });

      registerTool(server, {
        name: 'aidd_memory_edit_mistake',
        description:
          'Edit an existing permanent mistake entry. Updates only the provided fields, preserving the rest.',
        schema: {
          id: z.string().describe('Mistake entry ID'),
          error: z.string().optional().describe('Updated error description'),
          rootCause: z.string().optional().describe('Updated root cause'),
          fix: z.string().optional().describe('Updated fix'),
          prevention: z.string().optional().describe('Updated prevention strategy'),
        },
        annotations: { idempotentHint: true },
        handler: async (args) => {
          const a = args as {
            id: string;
            error?: string;
            rootCause?: string;
            fix?: string;
            prevention?: string;
          };

          const backend = await storage.getBackend();
          const entry = await backend.getPermanentMemory(a.id);
          if (!entry) return createErrorResult(`Entry ${a.id} not found`);
          if (entry.type !== 'mistake') return createErrorResult(`Entry ${a.id} is type '${entry.type}', not 'mistake'`);

          const existing = entryToMistake(entry);
          if (a.error !== undefined) existing.error = stripPrivateTags(a.error);
          if (a.rootCause !== undefined) existing.rootCause = stripPrivateTags(a.rootCause);
          if (a.fix !== undefined) existing.fix = stripPrivateTags(a.fix);
          if (a.prevention !== undefined) existing.prevention = stripPrivateTags(a.prevention);

          await backend.savePermanentMemory(mistakeToEntry(existing));
          return createJsonResult({ id: a.id, type: 'mistake', updated: true });
        },
      });

      registerTool(server, {
        name: 'aidd_memory_edit_convention',
        description:
          'Edit an existing permanent convention entry. Updates only the provided fields, preserving the rest.',
        schema: {
          id: z.string().describe('Convention entry ID'),
          convention: z.string().optional().describe('Updated convention text'),
          example: z.string().optional().describe('Updated example'),
          rationale: z.string().optional().describe('Updated rationale'),
        },
        annotations: { idempotentHint: true },
        handler: async (args) => {
          const a = args as {
            id: string;
            convention?: string;
            example?: string;
            rationale?: string;
          };

          const backend = await storage.getBackend();
          const entry = await backend.getPermanentMemory(a.id);
          if (!entry) return createErrorResult(`Entry ${a.id} not found`);
          if (entry.type !== 'convention') return createErrorResult(`Entry ${a.id} is type '${entry.type}', not 'convention'`);

          const existing = entryToConvention(entry);
          if (a.convention !== undefined) existing.convention = stripPrivateTags(a.convention);
          if (a.example !== undefined) existing.example = stripPrivateTags(a.example);
          if (a.rationale !== undefined) existing.rationale = stripPrivateTags(a.rationale);

          await backend.savePermanentMemory(conventionToEntry(existing));
          return createJsonResult({ id: a.id, type: 'convention', updated: true });
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

          // Confidence decay: if pruned entry is a convention, decay related evolution candidates
          if (type === 'convention') {
            try {
              const candidates = await backend.listEvolutionCandidates({});
              const prunedTokens = new Set(entry.title.toLowerCase().split(/\s+/));
              for (const c of candidates) {
                if (c.type !== 'new_convention' && c.type !== 'rule_elevation') continue;
                const candidateTokens = new Set(c.title.toLowerCase().split(/\s+/));
                const intersection = [...prunedTokens].filter((t) => candidateTokens.has(t)).length;
                const union = prunedTokens.size + candidateTokens.size - intersection;
                const jaccard = union > 0 ? intersection / union : 0;
                if (jaccard > 0.3) {
                  c.confidence = Math.round(c.confidence * 0.5);
                  if (c.confidence < 30) {
                    await backend.deleteEvolutionCandidate(c.id);
                  } else {
                    await backend.saveEvolutionCandidate(c);
                  }
                }
              }
            } catch (err) {
              logger.warn('Failed to decay related evolution candidates during prune', err);
            }
          }

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

      // ---- Integrity check: detect memory entries contradicting rules ----
      registerTool(server, {
        name: 'aidd_memory_integrity_check',
        description:
          'Check permanent memory entries against framework rules for contradictions. Detects conventions that violate negative constraints (Never, MUST NOT, Forbidden).',
        schema: {
          autoFix: z.boolean().optional().describe('Auto-delete convention entries with high confidence violations (>0.8). Decisions/mistakes are never auto-deleted.'),
        },
        annotations: { idempotentHint: true },
        handler: async (args) => {
          const { autoFix } = args as { autoFix?: boolean };
          const backend = await storage.getBackend();

          // Parse negative constraints from rules (phrase-aware to reduce false positives)
          const rules = context.contentLoader.getIndex().rules;
          const GENERIC_TOKENS = new Set([
            'must', 'not', 'never', 'forbidden', 'dont', 'do', 'avoid',
            'should', 'with', 'from', 'that', 'this', 'data', 'code', 'files',
          ]);
          const constraints: Array<{ keywords: string[]; source: string; line: string }> = [];
          for (const rule of rules) {
            const content = rule.getContent();
            const lines = content.split('\n');
            for (const line of lines) {
              const match = line.match(/\b(?:Never|MUST NOT|Forbidden|NEVER|Do NOT|Don't)\b[:\s]+(.+)/i);
              if (match) {
                const clause = match[1]!.toLowerCase();
                const quoted = [...clause.matchAll(/`([^`]+)`|"([^"]+)"|'([^']+)'/g)]
                  .map((m) => (m[1] ?? m[2] ?? m[3] ?? '').trim())
                  .filter((v) => v.length >= 3);
                const tokens = clause
                  .replace(/[^a-z0-9_\-\s]/g, ' ')
                  .split(/\s+/)
                  .map((t) => t.trim())
                  .filter((t) => t.length >= 4 && !GENERIC_TOKENS.has(t));
                const keywords = [...new Set([...quoted, ...tokens])].slice(0, 8);
                if (keywords.length > 0) {
                  constraints.push({ keywords, source: rule.name, line: clause });
                }
              }
            }
          }

          if (constraints.length === 0) {
            return createJsonResult({ totalChecked: 0, violations: [], message: 'No negative constraints found in rules' });
          }

          // Check all permanent memory entries
          const entries = await backend.listPermanentMemory({});
          const violations: Array<{
            id: string;
            type: string;
            title: string;
            matchedConstraints: string[];
            confidence: number;
          }> = [];
          let autoFixed = 0;

          for (const entry of entries) {
            const text = `${entry.title} ${entry.content}`.toLowerCase();
            const matchedConstraints: string[] = [];
            let bestConfidence = 0;

            for (const c of constraints) {
              const matchedKeywords = c.keywords.filter((kw) => {
                const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                return re.test(text);
              });
              if (matchedKeywords.length === 0) continue;

              const confidence = matchedKeywords.length / c.keywords.length;
              if (confidence >= 0.5) {
                bestConfidence = Math.max(bestConfidence, confidence);
                matchedConstraints.push(
                  `${matchedKeywords.join(', ')} (${c.source})`,
                );
              }
            }

            if (matchedConstraints.length === 0) continue;

            violations.push({
              id: entry.id,
              type: entry.type,
              title: entry.title,
              matchedConstraints: [...new Set(matchedConstraints)],
              confidence: Math.round(bestConfidence * 100) / 100,
            });

            // AutoFix: only conventions with high confidence
            if (autoFix && entry.type === 'convention' && bestConfidence > 0.8) {
              await backend.deletePermanentMemory(entry.id);
              autoFixed++;
            }
          }

          return createJsonResult({
            totalChecked: entries.length,
            constraintsParsed: constraints.length,
            violations,
            autoFixed,
          });
        },
      });
    },
  };
}
