import { z } from 'zod';
import { execFileSync } from 'node:child_process';
import { resolve as resolvePath } from 'node:path';
import {
  registerTool,
  createJsonResult,
  createErrorResult,
  createTextResult,
  detectProject,
  readJsonFile,
  deepMerge,
  DEFAULT_CONFIG,
} from '@aidd.md/mcp-shared';
import type { AiddConfig, AiddModule, ModuleContext } from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Detect current git branch from project root. Falls back to 'main'. */
function detectGitBranch(projectRoot: string): string {
  try {
    return execFileSync('git', ['branch', '--show-current'], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 3000,
    }).trim() || 'main';
  } catch {
    return 'main';
  }
}

function getLiveConfig(context: ModuleContext): AiddConfig {
  const configPath = resolvePath(context.aiddDir, 'config.json');
  const raw = readJsonFile<Partial<AiddConfig>>(configPath);
  return raw ? deepMerge(DEFAULT_CONFIG, raw) : context.config;
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const bootstrapModule: AiddModule = {
  name: 'bootstrap',
  description: 'Project detection, configuration, and comprehensive AIDD startup',

  register(server: McpServer, context: ModuleContext) {
    // -----------------------------------------------------------------------
    // aidd_detect_project
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_detect_project',
      description:
        'Scan a directory for AIDD framework markers (AGENTS.md, rules/, skills/, etc.) and parse package.json for stack detection.',
      schema: {
        path: z
          .string()
          .optional()
          .describe('Directory path to scan. Defaults to project root.'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const projectInfo = detectProject(
          (args as { path?: string }).path ?? context.projectRoot,
        );
        return createJsonResult(projectInfo);
      },
    });

    // -----------------------------------------------------------------------
    // aidd_get_config
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_get_config',
      description:
        'Return the active AIDD MCP configuration (evolution, memory, model tracking, CI, content settings).',
      schema: {},
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async () => {
        return createJsonResult(getLiveConfig(context));
      },
    });

    // -----------------------------------------------------------------------
    // Resource: aidd://agents
    // -----------------------------------------------------------------------
    server.registerResource(
      'agents',
      'aidd://agents',
      { description: 'Agent definitions — Single Source of Truth for agent roles', mimeType: 'text/markdown' },
      async (uri) => {
        const agentsEntries = context.contentLoader.getIndex().agents;
        if (agentsEntries.length === 0) {
          return { contents: [{ uri: uri.href, text: 'No agent definitions found. Use aidd_scaffold to initialize.', mimeType: 'text/markdown' }] };
        }
        const sorted = [...agentsEntries].sort((a, b) =>
          a.name === 'index.md' ? -1 : b.name === 'index.md' ? 1 : a.name.localeCompare(b.name),
        );
        const content = sorted.map((e) => e.getContent()).join('\n\n---\n\n');
        return { contents: [{ uri: uri.href, text: content, mimeType: 'text/markdown' }] };
      },
    );

    // -----------------------------------------------------------------------
    // aidd_start — THE single startup call
    // Replaces aidd_bootstrap. Auto-starts session + loads full framework.
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_start',
      description:
        'One-call conversation starter: returns project detection, agent summary, active rules, and suggested next steps. Call this at the beginning of every conversation.',
      schema: {
        path: z
          .string()
          .optional()
          .describe('Project path to bootstrap from. Defaults to detected project root.'),
        branch: z
          .string()
          .optional()
          .describe('Git branch name. Auto-detected if omitted.'),
        aiProvider: z
          .object({
            provider: z.string(),
            model: z.string(),
            modelId: z.string(),
            client: z.string(),
            modelTier: z.string().optional(),
          })
          .optional()
          .describe('AI provider info. Uses defaults if omitted.'),
        taskClassification: z
          .object({
            domain: z.string(),
            nature: z.string(),
            complexity: z.string(),
            phase: z.string().optional(),
            tier: z.number().optional(),
            fastTrack: z.boolean().optional(),
            risky: z.boolean().optional(),
            skippableStages: z.array(z.string()).optional(),
          })
          .optional()
          .describe('Task classification'),
        memorySessionId: z
          .string()
          .optional()
          .describe('Cross-session continuity ID'),
        parentSessionId: z
          .string()
          .optional()
          .describe('Parent session for threading'),
      },
      annotations: { idempotentHint: false },
      handler: async (args) => {
        const startTime = performance.now();
        const a = args as Record<string, unknown>;
        const liveConfig = getLiveConfig(context);
        const projectPath = a['path'] as string | undefined;
        if (projectPath) {
          const requestedRoot = resolvePath(projectPath);
          const boundRoot = resolvePath(context.projectRoot);
          if (requestedRoot !== boundRoot) {
            return createErrorResult(
              `Project scope mismatch: MCP server is bound to "${boundRoot}" but aidd_start requested "${requestedRoot}". ` +
              `Restart/rebind MCP for that project root (cwd or AIDD_PROJECT_PATH) before creating sessions.`,
            );
          }
        }
        const info = projectPath ? detectProject(projectPath) : context.projectInfo;
        const index = context.contentLoader.getIndex();
        const classification = a['taskClassification'] as {
          domain?: string;
          complexity?: string;
          fastTrack?: boolean;
        } | undefined;
        const slimStartEnabled = liveConfig.content.slimStartEnabled ?? true;
        const slimStartTargetTokens = liveConfig.content.slimStartTargetTokens ?? 600;
        const isSlim = slimStartEnabled && (
          classification?.complexity === 'low' || classification?.fastTrack === true
        );

        const sections: string[] = [];

        // =================================================================
        // 1. Auto-start session via cross-module service
        // =================================================================
        let sessionId: string | null = null;
        const startSession = context.services['startSession'];

        if (startSession) {
          try {
            const branch = (a['branch'] as string) || detectGitBranch(context.projectRoot);
            const result = await startSession({
              branch,
              aiProvider: a['aiProvider'] ?? {
                provider: 'unknown',
                model: 'unknown',
                modelId: 'unknown',
                client: 'unknown',
              },
              taskClassification: a['taskClassification'],
              memorySessionId: a['memorySessionId'],
              parentSessionId: a['parentSessionId'],
            }) as { id: string; status: string; startedAt: string };

            sessionId = result.id;
          } catch (err) {
            context.logger.error('Failed to auto-start session:', err);
          }
        }

        // =================================================================
        // 2. Engine header
        // =================================================================
        sections.push('[[aidd.md]](https://aidd.md) Engine - ON');

        if (sessionId) {
          sections.push(`- **Session**: \`${sessionId}\` (active)`);
        } else {
          sections.push('- **Session**: failed to auto-start — call `aidd_session { action: "start" }` manually');
        }

        // =================================================================
        // 3. Project detection
        // =================================================================
        if (info.stack.name) {
          sections.push(`- **Package**: ${info.stack.name}${info.stack.version ? ` v${info.stack.version}` : ''}`);
        }

        const deps = Object.keys(info.stack.dependencies);
        if (deps.length > 0) {
          const topDeps = deps.slice(0, 15).join(', ');
          sections.push(`- **Dependencies** (${deps.length}): ${topDeps}${deps.length > 15 ? '...' : ''}`);
        }

        const markers = Object.entries(info.markers)
          .filter(([, v]) => v)
          .map(([k]) => k);
        if (markers.length > 0) {
          sections.push(`- **Markers**: ${markers.join(', ')}`);
        }

        // =================================================================
        // 4. PAPI: Pre-emptive mistake injection (both slim and full)
        // =================================================================
        const queryMistakes = context.services['queryDomainMistakes'] as
          ((domain: string, limit: number) => Promise<Array<{ error: string; fix: string }>>) | undefined;
        if (queryMistakes && classification?.domain) {
          try {
            const hazards = await queryMistakes(classification.domain, 3);
            if (hazards.length > 0) {
              sections.push('\n## Hazards to Avoid\n');
              for (const h of hazards) {
                sections.push(`- **${h.error}** → ${h.fix}`);
              }
            }
          } catch { /* silent — PAPI is best-effort */ }
        }

        if (isSlim) {
            // =============================================================
            // SLIM MODE: Critical guardrails only (~500-700 tokens total)
            // =============================================================
            sections.push('\n## Critical Guardrails\n');
            sections.push('- Never use `any` without documented exception');
            sections.push('- Never commit secrets');
            sections.push('- ES modules only (`import`/`export`)');
            sections.push(
              `\n[Slim] Low-complexity task. Target context ~${slimStartTargetTokens} tokens. ` +
              'Full context via `aidd_get_agent`, `aidd_get_routing_table`.',
            );
        } else {
          // =============================================================
          // FULL MODE: All sections (agents, rules, workflows, etc.)
          // =============================================================

          // 5. Agents (SSOT) — full routing.md content
          if (index.agents.length > 0) {
            sections.push('\n## Agents (SSOT)\n');
            const mainAgent = index.agents.find((ag) => ag.name === 'routing.md') ?? index.agents[0]!;
            sections.push(mainAgent.getContent());
            if (index.agents.length > 1) {
              sections.push(`\n*${index.agents.length} agent files available — use \`aidd_get_agent\` for individual agents*`);
            }
          }

          // 6. Active Rules — compact summaries to avoid context inflation
          if (index.rules.length > 0) {
            sections.push('\n## Active Rules (ENFORCE)\n');
            for (const rule of index.rules) {
              const title = rule.frontmatter['title'] ?? rule.name.replace('.md', '');
              const content = rule.getContent();
              sections.push(`### ${title}\n`);
              const strongLines = content
                .split('\n')
                .map((l) => l.trim())
                .filter((l) => /\b(MUST|MUST NOT|NEVER|DO NOT|FORBIDDEN)\b/i.test(l))
                .slice(0, 3);
              if (strongLines.length > 0) {
                for (const line of strongLines) {
                  sections.push(`- ${line}`);
                }
              } else {
                const fallback = content
                  .split('\n')
                  .map((l) => l.trim())
                  .find((l) => l.length > 0 && !l.startsWith('#'));
                if (fallback) sections.push(`- ${fallback.slice(0, 180)}`);
              }
              sections.push('');
            }
          }

          // 7. Workflows — list with descriptions
          if (index.workflows.length > 0) {
            sections.push('\n## Workflows\n');
            for (const wf of index.workflows) {
              const title = wf.frontmatter['title'] ?? wf.name.replace('.md', '');
              const desc = wf.frontmatter['description'] ?? '';
              const invocation = wf.frontmatter['invocation'] ?? '';
              sections.push(`- **${title}**${invocation ? ` (\`${invocation}\`)` : ''}${desc ? ` — ${desc}` : ''}`);
            }
          }

          // 8. Skills — list with triggers
          if (index.skills.length > 0) {
            sections.push('\n## Skills\n');
            for (const skill of index.skills) {
              const title = skill.frontmatter['title'] ?? skill.name.replace('.md', '');
              const triggers = skill.frontmatter['triggers'] ?? '';
              sections.push(`- **${title}**${triggers ? ` — triggers: ${triggers}` : ''}`);
            }
          }

          // 9. Specs — list
          if (index.specs.length > 0) {
            sections.push('\n## Specs\n');
            for (const spec of index.specs) {
              const title = spec.frontmatter['title'] ?? spec.name.replace('.md', '');
              sections.push(`- ${title}`);
            }
          }

          // 10. Knowledge (TKB) — list with categories
          if (index.knowledge.length > 0) {
            sections.push('\n## Knowledge (TKB)\n');
            for (const entry of index.knowledge) {
              const name = entry.frontmatter['name'] ?? entry.name.replace('.md', '');
              const category = entry.frontmatter['category'] ?? '';
              const maturity = entry.frontmatter['maturity'] ?? '';
              sections.push(`- **${name}**${category ? ` [${category}]` : ''}${maturity ? ` (${maturity})` : ''}`);
            }
          }

          // 11. Templates — list
          if (index.templates.length > 0) {
            sections.push('\n## Templates\n');
            for (const tpl of index.templates) {
              const title = tpl.frontmatter['title'] ?? tpl.name.replace('.md', '');
              sections.push(`- ${title}`);
            }
          }

          // 12. Suggested next steps (only if AIDD not detected)
          if (!info.detected) {
            sections.push('\n## Setup Required\n');
            sections.push('1. **Initialize AIDD**: `aidd_scaffold { preset: "standard" }`');
            sections.push('2. **Classify your task**: `aidd_classify_task { description: "..." }`');
          }
        }

        // =================================================================
        // TTH: Time to Hydrate
        // =================================================================
        const startupMs = Math.round(performance.now() - startTime);
        // Append timing to session line
        if (sessionId) {
          const sessionLineIdx = sections.findIndex((s) => s.includes('**Session**'));
          if (sessionLineIdx >= 0) {
            sections[sessionLineIdx] = `- **Session**: \`${sessionId}\` (active, ${startupMs}ms)`;
          }
        }

        // Fire-and-forget: update session with timing metrics
        const updateTiming = context.services['updateSessionTiming'] as
          ((id: string, ms: number) => Promise<void>) | undefined;
        if (sessionId && updateTiming) {
          updateTiming(sessionId, startupMs).catch(() => {});
        }

        return createTextResult(sections.join('\n'));
      },
    });
  },
};
