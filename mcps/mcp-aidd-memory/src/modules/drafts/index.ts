import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  createErrorResult,
  readJsonFile,
  writeJsonFile,
  writeFileSafe,
  ensureDir,
  readFileOrNull,
  generateId,
  now,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ModuleContext } from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DraftManifest, DraftEntry, DraftCategory } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function manifestPath(aiddDir: string): string {
  return resolve(aiddDir, 'drafts', 'manifest.json');
}

function draftContentPath(aiddDir: string, category: string, id: string): string {
  return resolve(aiddDir, 'drafts', category, `${id}.md`);
}

function readManifest(aiddDir: string): DraftManifest {
  return readJsonFile<DraftManifest>(manifestPath(aiddDir)) ?? { drafts: [], updatedAt: now() };
}

function writeManifest(aiddDir: string, manifest: DraftManifest): void {
  ensureDir(resolve(aiddDir, 'drafts'));
  writeJsonFile(manifestPath(aiddDir), manifest);
}

function resolveTargetDir(projectRoot: string, category: DraftCategory): string {
  // Check if project uses ai/ prefix
  const aiPrefixed = resolve(projectRoot, 'ai', category);
  if (existsSync(aiPrefixed)) return aiPrefixed;

  // Check root-level
  const rootLevel = resolve(projectRoot, category);
  if (existsSync(rootLevel)) return rootLevel;

  // Default to ai/ prefix
  return aiPrefixed;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createDraftsModule(): AiddModule {
  return {
    name: 'drafts',
    description: 'Content draft management — create, review, approve drafts for rules/knowledge/skills/workflows',

    register(server: McpServer, context: ModuleContext) {
      // ---- Create draft ----
      registerTool(server, {
        name: 'aidd_draft_create',
        description:
          'Create a new content draft in .aidd/drafts/. Drafts can be rules, knowledge entries, skills, or workflows awaiting approval.',
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
            confidence: a.confidence,
            source: a.source,
            evolutionCandidateId: a.evolutionCandidateId,
            status: 'pending',
            createdAt: now(),
            updatedAt: now(),
          };

          // Write content file
          const contentDir = resolve(context.aiddDir, 'drafts', a.category);
          ensureDir(contentDir);
          writeFileSafe(draftContentPath(context.aiddDir, a.category, entry.id), a.content);

          // Update manifest
          const manifest = readManifest(context.aiddDir);
          manifest.drafts.push(entry);
          manifest.updatedAt = now();
          writeManifest(context.aiddDir, manifest);

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

          const manifest = readManifest(context.aiddDir);
          let drafts = manifest.drafts;

          if (category) drafts = drafts.filter((d) => d.category === category);
          if (status) drafts = drafts.filter((d) => d.status === status);

          // Sort by confidence descending
          drafts.sort((a, b) => b.confidence - a.confidence);

          return createJsonResult({
            count: Math.min(drafts.length, limit),
            drafts: drafts.slice(0, limit).map((d) => ({
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

          const manifest = readManifest(context.aiddDir);
          const draft = manifest.drafts.find((d) => d.id === id);
          if (!draft) return createErrorResult(`Draft ${id} not found`);
          if (draft.status !== 'pending') return createErrorResult(`Draft ${id} is already ${draft.status}`);

          // Read draft content
          const contentPath = draftContentPath(context.aiddDir, draft.category, draft.id);
          const content = readFileOrNull(contentPath);
          if (!content) return createErrorResult(`Draft content file not found: ${contentPath}`);

          // Resolve target
          const target = targetPath
            ? resolve(context.projectRoot, targetPath)
            : resolve(resolveTargetDir(context.projectRoot, draft.category), draft.filename);

          // Write to project directory
          ensureDir(resolve(target, '..'));
          writeFileSafe(target, content);

          // Update manifest
          draft.status = 'approved';
          draft.approvedAt = now();
          draft.updatedAt = now();
          manifest.updatedAt = now();
          writeManifest(context.aiddDir, manifest);

          return createJsonResult({
            id: draft.id,
            approved: true,
            promotedTo: target,
            category: draft.category,
            filename: draft.filename,
          });
        },
      });
    },
  };
}
