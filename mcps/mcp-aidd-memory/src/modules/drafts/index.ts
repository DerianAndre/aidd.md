import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  createErrorResult,
  writeFileSafe,
  ensureDir,
  generateId,
  now,
  createLogger,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ModuleContext, DraftEntry } from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageProvider } from '../../storage/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DraftCategory = 'rules' | 'knowledge' | 'skills' | 'workflows';

function resolveTargetDir(projectRoot: string, category: DraftCategory): string {
  const aiPrefixed = resolve(projectRoot, 'ai', category);
  if (existsSync(aiPrefixed)) return aiPrefixed;

  const rootLevel = resolve(projectRoot, category);
  if (existsSync(rootLevel)) return rootLevel;

  return aiPrefixed;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const logger = createLogger('drafts');

export function createDraftsModule(storage: StorageProvider): AiddModule {
  return {
    name: 'drafts',
    description: 'Content draft management — create, review, approve drafts for rules/knowledge/skills/workflows',

    register(server: McpServer, context: ModuleContext) {
      // ---- Create draft ----
      registerTool(server, {
        name: 'aidd_draft_create',
        description:
          'Create a new content draft. Drafts can be rules, knowledge entries, skills, or workflows awaiting approval.',
        schema: {
          category: z.enum(['rules', 'knowledge', 'skills', 'workflows']).describe('Draft category'),
          title: z.string().describe('Draft title'),
          filename: z.string().describe('Target filename (e.g., "no-inline-styles.md")'),
          content: z.string().describe('Draft content (markdown)'),
          confidence: z.number().optional().default(50).describe('Confidence score (0-100)'),
          source: z.enum(['evolution', 'manual']).optional().default('manual').describe('Draft source'),
          evolutionCandidateId: z.string().optional().describe('Associated evolution candidate ID'),
        },
        annotations: { idempotentHint: false },
        handler: async (args) => {
          const a = args as {
            category: DraftCategory;
            title: string;
            filename: string;
            content: string;
            confidence: number;
            source: 'evolution' | 'manual';
            evolutionCandidateId?: string;
          };

          const entry: DraftEntry = {
            id: generateId(),
            category: a.category,
            title: a.title,
            filename: a.filename,
            content: a.content,
            confidence: a.confidence,
            source: a.source,
            evolutionCandidateId: a.evolutionCandidateId,
            status: 'pending',
            createdAt: now(),
            updatedAt: now(),
          };

          const backend = await storage.getBackend();
          await backend.saveDraft(entry);

          return createJsonResult({
            id: entry.id,
            category: entry.category,
            title: entry.title,
            filename: entry.filename,
            status: 'pending',
            created: true,
          });
        },
      });

      // ---- List drafts ----
      registerTool(server, {
        name: 'aidd_draft_list',
        description:
          'List content drafts with confidence scores. Filter by category or status.',
        schema: {
          category: z.enum(['rules', 'knowledge', 'skills', 'workflows']).optional().describe('Filter by category'),
          status: z.enum(['pending', 'approved', 'rejected']).optional().describe('Filter by status'),
          limit: z.number().optional().default(20).describe('Max results'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { category, status, limit } = args as {
            category?: DraftCategory;
            status?: string;
            limit: number;
          };

          const backend = await storage.getBackend();
          const drafts = await backend.listDrafts({ category, status, limit });

          return createJsonResult({
            count: drafts.length,
            drafts: drafts.map((d) => ({
              id: d.id,
              category: d.category,
              title: d.title,
              filename: d.filename,
              confidence: d.confidence,
              source: d.source,
              status: d.status,
              createdAt: d.createdAt,
            })),
          });
        },
      });

      // ---- Approve draft ----
      registerTool(server, {
        name: 'aidd_draft_approve',
        description:
          'Approve a draft and promote its content to the project AIDD directory (rules/, knowledge/, etc.).',
        schema: {
          id: z.string().describe('Draft ID to approve'),
          targetPath: z.string().optional().describe('Override target path (auto-detected from category if omitted)'),
        },
        annotations: { idempotentHint: false },
        handler: async (args) => {
          const { id, targetPath } = args as { id: string; targetPath?: string };

          const backend = await storage.getBackend();
          const draft = await backend.getDraft(id);
          if (!draft) return createErrorResult(`Draft ${id} not found`);
          if (draft.status !== 'pending') return createErrorResult(`Draft ${id} is already ${draft.status}`);
          if (!draft.content) return createErrorResult(`Draft ${id} has no content`);

          // Resolve target path
          const target = targetPath
            ? resolve(context.projectRoot, targetPath)
            : resolve(resolveTargetDir(context.projectRoot, draft.category as DraftCategory), draft.filename);

          // Write to project directory
          ensureDir(resolve(target, '..'));
          writeFileSafe(target, draft.content);

          // Update draft status in DB
          draft.status = 'approved';
          draft.approvedAt = now();
          draft.updatedAt = now();
          await backend.updateDraft(draft);

          // Update linked evolution candidate status
          let evolutionUpdated = false;
          if (draft.evolutionCandidateId) {
            try {
              const candidates = await backend.listEvolutionCandidates({});
              const candidate = candidates.find((c) => c.id === draft.evolutionCandidateId);
              if (candidate) {
                candidate.status = 'approved';
                candidate.updatedAt = now();
                await backend.updateEvolutionCandidate(candidate);
                await backend.appendEvolutionLog({
                  id: generateId(),
                  candidateId: candidate.id,
                  action: 'approved',
                  title: candidate.title,
                  confidence: candidate.confidence,
                  timestamp: now(),
                });
                evolutionUpdated = true;
              }
            } catch (err) {
              logger.warn('Failed to update linked evolution candidate on draft approval', err);
            }
          }

          return createJsonResult({
            id: draft.id,
            approved: true,
            promotedTo: target,
            category: draft.category,
            filename: draft.filename,
            evolutionUpdated,
          });
        },
      });

      // ---- Reject draft ----
      registerTool(server, {
        name: 'aidd_draft_reject',
        description:
          'Reject a pending draft. Optionally updates linked evolution candidate status.',
        schema: {
          id: z.string().describe('Draft ID to reject'),
          reason: z.string().optional().describe('Reason for rejection'),
        },
        annotations: { idempotentHint: true },
        handler: async (args) => {
          const { id, reason } = args as { id: string; reason?: string };

          const backend = await storage.getBackend();
          const draft = await backend.getDraft(id);
          if (!draft) return createErrorResult(`Draft ${id} not found`);
          if (draft.status !== 'pending') return createErrorResult(`Draft ${id} is already ${draft.status}`);

          draft.status = 'rejected';
          draft.rejectedReason = reason;
          draft.updatedAt = now();
          await backend.updateDraft(draft);

          // Update linked evolution candidate status
          let evolutionUpdated = false;
          if (draft.evolutionCandidateId) {
            try {
              const candidates = await backend.listEvolutionCandidates({});
              const candidate = candidates.find((c) => c.id === draft.evolutionCandidateId);
              if (candidate) {
                candidate.status = 'rejected';
                candidate.updatedAt = now();
                await backend.updateEvolutionCandidate(candidate);
                await backend.appendEvolutionLog({
                  id: generateId(),
                  candidateId: candidate.id,
                  action: 'rejected',
                  title: candidate.title,
                  confidence: candidate.confidence,
                  timestamp: now(),
                });
                evolutionUpdated = true;
              }
            } catch (err) {
              logger.warn('Failed to update linked evolution candidate on draft rejection', err);
            }
          }

          return createJsonResult({
            id: draft.id,
            rejected: true,
            reason,
            evolutionUpdated,
          });
        },
      });
    },
  };
}
