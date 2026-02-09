import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  createErrorResult,
  generateId,
  now,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ArtifactEntry } from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageProvider } from '../../storage/index.js';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createArtifactsModule(storage: StorageProvider): AiddModule {
  return {
    name: 'artifacts',
    description: 'Artifact lifecycle management — create, update, archive, list workflow-produced documents',

    register(server: McpServer) {
      registerTool(server, {
        name: 'aidd_artifact',
        description:
          'Manage artifacts (workflow-produced documents). Actions: create, update, archive, get, list, delete.',
        schema: {
          action: z.enum(['create', 'update', 'archive', 'get', 'list', 'delete']).describe('Action to perform'),
          // create/update params
          id: z.string().optional().describe('Artifact ID (required for update/archive/get/delete)'),
          type: z.string().optional().describe('Artifact type: plan, brainstorm, research, adr, diagram, issue, spec, checklist, retro'),
          feature: z.string().optional().describe('Feature slug (required for create)'),
          title: z.string().optional().describe('Artifact title (required for create)'),
          content: z.string().optional().describe('Full markdown content'),
          description: z.string().optional().describe('Short description'),
          status: z.string().optional().describe('Status: active or done'),
          sessionId: z.string().optional().describe('Associated session ID'),
          date: z.union([z.string(), z.number()]).optional().describe('Date override (Unix ms integer or ISO date string)'),
          // list params
          limit: z.number().optional().describe('Max results for list (default 50)'),
        },
        annotations: { idempotentHint: false },
        handler: async (args) => {
          const a = args as Record<string, unknown>;
          const action = a['action'] as string;
          const backend = await storage.getBackend();

          switch (action) {
            case 'create': {
              if (!a['feature']) return createErrorResult('feature is required for create');
              if (!a['title']) return createErrorResult('title is required for create');

              const nowMs = Date.now();
              const dateValue = (a['date'] as string | number | undefined) ?? nowMs;

              const artifact: ArtifactEntry = {
                id: generateId(),
                sessionId: a['sessionId'] as string | undefined,
                type: (a['type'] as ArtifactEntry['type']) ?? 'plan',
                feature: a['feature'] as string,
                status: (a['status'] as ArtifactEntry['status']) ?? 'active',
                title: a['title'] as string,
                description: (a['description'] as string) ?? '',
                content: (a['content'] as string) ?? '',
                date: dateValue,
                createdAt: now(),
                updatedAt: now(),
              };

              await backend.saveArtifact(artifact);
              return createJsonResult({ id: artifact.id, status: artifact.status, date: artifact.date });
            }

            case 'update': {
              if (!a['id']) return createErrorResult('id is required for update');
              const artifact = await backend.getArtifact(a['id'] as string);
              if (!artifact) return createErrorResult(`Artifact ${a['id']} not found`);

              if (a['title']) artifact.title = a['title'] as string;
              if (a['content']) artifact.content = a['content'] as string;
              if (a['description']) artifact.description = a['description'] as string;
              if (a['status']) artifact.status = a['status'] as ArtifactEntry['status'];
              if (a['type']) artifact.type = a['type'] as ArtifactEntry['type'];
              if (a['feature']) artifact.feature = a['feature'] as string;
              artifact.updatedAt = now();

              await backend.saveArtifact(artifact);
              return createJsonResult({ id: artifact.id, status: artifact.status, updatedAt: artifact.updatedAt });
            }

            case 'archive': {
              if (!a['id']) return createErrorResult('id is required for archive');
              const artifact = await backend.getArtifact(a['id'] as string);
              if (!artifact) return createErrorResult(`Artifact ${a['id']} not found`);

              artifact.status = 'done';
              artifact.updatedAt = now();

              await backend.saveArtifact(artifact);
              return createJsonResult({ id: artifact.id, status: 'done', updatedAt: artifact.updatedAt });
            }

            case 'get': {
              if (!a['id']) return createErrorResult('id is required for get');
              const artifact = await backend.getArtifact(a['id'] as string);
              if (!artifact) return createErrorResult(`Artifact ${a['id']} not found`);
              return createJsonResult(artifact);
            }

            case 'list': {
              const artifacts = await backend.listArtifacts({
                type: a['type'] as string | undefined,
                status: a['status'] as string | undefined,
                feature: a['feature'] as string | undefined,
                sessionId: a['sessionId'] as string | undefined,
                limit: (a['limit'] as number | undefined) ?? 50,
              });
              return createJsonResult({ count: artifacts.length, artifacts });
            }

            case 'delete': {
              if (!a['id']) return createErrorResult('id is required for delete');
              const deleted = await backend.deleteArtifact(a['id'] as string);
              if (!deleted) return createErrorResult(`Artifact ${a['id']} not found`);
              return createJsonResult({ id: a['id'], deleted: true });
            }

            default:
              return createErrorResult(`Unknown action: ${action}`);
          }
        },
      });
    },
  };
}
