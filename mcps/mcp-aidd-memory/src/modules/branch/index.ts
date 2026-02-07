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
  now,
} from '@aidd.md/mcp-shared';
import type {
  AiddModule,
  ModuleContext,
  BranchContext,
} from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageProvider } from '../../storage/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeBranch(branch: string): string {
  return branch.replace(/\//g, '--');
}

function branchPath(aiddDir: string, branch: string): string {
  return resolve(aiddDir, 'branches', `${sanitizeBranch(branch)}.json`);
}

function emptyBranchContext(branch: string): BranchContext {
  return {
    branch,
    completedTasks: [],
    pendingTasks: [],
    decisions: [],
    errorsEncountered: [],
    filesModified: [],
    sessionsCount: 0,
    totalDurationMs: 0,
    updatedAt: now(),
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createBranchModule(storage: StorageProvider): AiddModule {
  return {
    name: 'branch',
    description: 'Branch context management — accumulate decisions, errors, files across sessions',

    register(server: McpServer, context: ModuleContext) {
      const branchesDir = resolve(context.aiddDir, 'branches');
      const archiveDir = resolve(context.aiddDir, 'branches', 'archive');

      registerTool(server, {
        name: 'aidd_branch',
        description:
          'Manage branch context. Actions: get (read branch context), save (update branch context), promote (copy session data to branch), list (show all branches), merge (archive branch, optionally promote to permanent memory).',
        schema: {
          action: z.enum(['get', 'save', 'promote', 'list', 'merge']).describe('Action to perform'),
          branch: z.string().optional().describe('Branch name (required for get/save/promote/merge)'),
          // save params
          feature: z.string().optional().describe('Feature description'),
          phase: z.string().optional().describe('Current AIDD phase'),
          spec: z.string().optional().describe('Spec reference'),
          plan: z.string().optional().describe('Plan reference'),
          completedTasks: z.array(z.string()).optional().describe('Tasks to append as completed'),
          pendingTasks: z.array(z.string()).optional().describe('Tasks pending to set'),
          decisions: z
            .array(z.object({ decision: z.string(), reasoning: z.string(), sessionId: z.string() }))
            .optional()
            .describe('Decisions to append'),
          errorsEncountered: z
            .array(z.object({ error: z.string(), fix: z.string(), sessionId: z.string() }))
            .optional()
            .describe('Errors to append'),
          filesModified: z.array(z.string()).optional().describe('Files to append'),
          // promote params
          sessionId: z.string().optional().describe('Session ID to promote from (for promote action)'),
          // merge params
          promoteDecisions: z
            .boolean()
            .optional()
            .describe('Whether to promote decisions to permanent memory on merge'),
        },
        annotations: { idempotentHint: true },
        handler: async (args) => {
          const a = args as Record<string, unknown>;
          const action = a['action'] as string;

          switch (action) {
            case 'get': {
              if (!a['branch']) return createErrorResult('branch is required for get');
              const filePath = branchPath(context.aiddDir, a['branch'] as string);
              const ctx = readJsonFile<BranchContext>(filePath);
              if (!ctx) return createJsonResult(emptyBranchContext(a['branch'] as string));
              return createJsonResult(ctx);
            }

            case 'save': {
              if (!a['branch']) return createErrorResult('branch is required for save');
              const branch = a['branch'] as string;
              const filePath = branchPath(context.aiddDir, branch);
              const existing = readJsonFile<BranchContext>(filePath) ?? emptyBranchContext(branch);

              // Merge fields
              if (a['feature']) existing.feature = a['feature'] as string;
              if (a['phase']) existing.phase = a['phase'] as string;
              if (a['spec']) existing.spec = a['spec'] as string;
              if (a['plan']) existing.plan = a['plan'] as string;
              if (a['completedTasks'])
                existing.completedTasks.push(...(a['completedTasks'] as string[]));
              if (a['pendingTasks']) existing.pendingTasks = a['pendingTasks'] as string[];
              if (a['decisions'])
                existing.decisions.push(...(a['decisions'] as BranchContext['decisions']));
              if (a['errorsEncountered'])
                existing.errorsEncountered.push(...(a['errorsEncountered'] as BranchContext['errorsEncountered']));
              if (a['filesModified']) {
                for (const f of a['filesModified'] as string[]) {
                  if (!existing.filesModified.includes(f)) existing.filesModified.push(f);
                }
              }
              existing.updatedAt = now();

              ensureDir(branchesDir);
              writeJsonFile(filePath, existing);
              return createJsonResult({ branch, saved: true, updatedAt: existing.updatedAt });
            }

            case 'promote': {
              if (!a['sessionId']) return createErrorResult('sessionId is required for promote');
              if (!a['branch']) return createErrorResult('branch is required for promote');

              const backend = await storage.getBackend();
              const session = await backend.getSession(a['sessionId'] as string);
              if (!session) return createErrorResult(`Session ${a['sessionId']} not found`);

              const branch = a['branch'] as string;
              const filePath = branchPath(context.aiddDir, branch);
              const existing = readJsonFile<BranchContext>(filePath) ?? emptyBranchContext(branch);

              // Copy session data to branch
              for (const d of session.decisions) {
                existing.decisions.push({
                  decision: d.decision,
                  reasoning: d.reasoning,
                  sessionId: session.id,
                });
              }
              for (const e of session.errorsResolved) {
                existing.errorsEncountered.push({
                  error: e.error,
                  fix: e.fix,
                  sessionId: session.id,
                });
              }
              for (const f of session.filesModified) {
                if (!existing.filesModified.includes(f)) existing.filesModified.push(f);
              }
              existing.completedTasks.push(...session.tasksCompleted);
              existing.sessionsCount += 1;

              if (session.startedAt && session.endedAt) {
                const duration = new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime();
                existing.totalDurationMs += Math.max(0, duration);
              }

              existing.updatedAt = now();

              ensureDir(branchesDir);
              writeJsonFile(filePath, existing);
              return createJsonResult({
                branch,
                promoted: true,
                sessionId: session.id,
                decisionsAdded: session.decisions.length,
                errorsAdded: session.errorsResolved.length,
              });
            }

            case 'list': {
              ensureDir(branchesDir);
              const files = listFiles(branchesDir, { extensions: ['.json'] });
              const branches = files
                .filter((f) => !f.includes('archive'))
                .map((f) => {
                  const ctx = readJsonFile<BranchContext>(f);
                  return ctx
                    ? {
                        branch: ctx.branch,
                        feature: ctx.feature,
                        phase: ctx.phase,
                        sessions: ctx.sessionsCount,
                        decisions: ctx.decisions.length,
                        updatedAt: ctx.updatedAt,
                      }
                    : null;
                })
                .filter(Boolean);

              return createJsonResult({ count: branches.length, branches });
            }

            case 'merge': {
              if (!a['branch']) return createErrorResult('branch is required for merge');
              const branch = a['branch'] as string;
              const filePath = branchPath(context.aiddDir, branch);
              const ctx = readJsonFile<BranchContext>(filePath);
              if (!ctx) return createErrorResult(`Branch context for "${branch}" not found`);

              // Archive
              ensureDir(archiveDir);
              const archivePath = resolve(archiveDir, `${sanitizeBranch(branch)}-${Date.now()}.json`);
              writeJsonFile(archivePath, ctx);

              // Remove active branch file
              try {
                const { unlinkSync } = await import('node:fs');
                unlinkSync(filePath);
              } catch {
                // Already removed
              }

              return createJsonResult({
                branch,
                merged: true,
                archived: archivePath,
                decisions: ctx.decisions.length,
                sessions: ctx.sessionsCount,
              });
            }

            default:
              return createErrorResult(`Unknown action: ${action}`);
          }
        },
      });
    },
  };
}
