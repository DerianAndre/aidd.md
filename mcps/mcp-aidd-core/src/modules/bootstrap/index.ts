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
import type { AiddConfig, AiddModule, ModuleContext, TokenBudget } from '@aidd.md/mcp-shared';
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
  return deepMerge(DEFAULT_CONFIG, raw ?? context.config);
}

/**
 * Determine workflow mode from classification.
 * Returns: 'full' | 'guided' | 'fast-track'
 */
function resolveWorkflowMode(classification?: {
  fastTrack?: boolean;
  skippableStages?: string[];
}): { mode: 'full' | 'guided' | 'fast-track'; skipped: string[] } {
  const tc = classification ?? {};
  const explicitSkip = Array.isArray(tc.skippableStages) && tc.skippableStages.length > 0
    ? tc.skippableStages
    : null;
  const isFastTrack = tc.fastTrack === true;
  const defaultSkip = ['brainstorm', 'plan', 'checklist'];
  const skipped = explicitSkip ?? (isFastTrack ? defaultSkip : []);

  if (skipped.includes('brainstorm') && skipped.includes('plan')) return { mode: 'fast-track', skipped };
  if (skipped.includes('brainstorm')) return { mode: 'guided', skipped };
  if (skipped.length === 0) return { mode: 'full', skipped };
  return { mode: 'guided', skipped };
}

/**
 * Build the workflow pipeline section for aidd_start response.
 * BAP (Brainstorm & Ask → Plan) with token budget verbosity.
 * When sessionTracking is false, tool call instructions are replaced with plain guidance.
 */
function buildWorkflowPipeline(
  sessionId: string | null,
  classification?: {
    fastTrack?: boolean;
    skippableStages?: string[];
    complexity?: string;
  },
  tokenBudget: TokenBudget = 'standard',
  sessionTracking: boolean = true,
): string[] {
  const sid = sessionId ?? '<SESSION_ID>';
  const lines: string[] = [];
  const { mode, skipped } = resolveWorkflowMode(classification);
  const t = sessionTracking; // shorthand for conditionals

  // --- Fast-Track (always compact regardless of budget) ---
  if (mode === 'fast-track') {
    const skippedLabel = skipped.join(', ') || 'none';
    lines.push('\n## Workflow\n');
    lines.push(t
      ? `Session: \`${sid}\` | Mode: Fast-Track (skipping: ${skippedLabel})\n`
      : `Mode: Workflow-only (no tracking) | Fast-Track (skipping: ${skippedLabel})\n`);
    lines.push(t
      ? `1. **Build** \u2014 Execute directly. Update: \`aidd_session { action: "update", id: "${sid}", tasksCompleted: [...] }\``
      : '1. **Build** \u2014 Execute directly.');
    lines.push(t
      ? `2. **Ship** \u2014 Create retro artifact. End: \`aidd_session { action: "end", id: "${sid}" }\``
      : '2. **Ship** \u2014 Review results. Wrap up.');
    return lines;
  }

  // --- Guided mode ---
  if (mode === 'guided') {
    lines.push('\n## Workflow\n');
    lines.push(t
      ? `Session: \`${sid}\` | Mode: Guided | Budget: ${tokenBudget}\n`
      : `Mode: Workflow-only (no tracking) | Guided | Budget: ${tokenBudget}\n`);
    if (tokenBudget === 'minimal') {
      lines.push(t
        ? '1. **Ask & Plan** \u2014 Ask user \u2192 plan artifact \u2192 approval'
        : '1. **Ask & Plan** \u2014 Ask user \u2192 plan \u2192 approval');
      lines.push(t
        ? '2. **Build** \u2014 Execute. Update session.'
        : '2. **Build** \u2014 Execute plan.');
      lines.push(t
        ? '3. **Verify + Ship** \u2014 Typecheck/tests/build. Retro \u2192 archive \u2192 end session.'
        : '3. **Verify + Ship** \u2014 Typecheck/tests/build. Review and wrap up.');
    } else {
      lines.push('### Step 1 \u2014 Ask & Plan');
      lines.push('- Ask the user at least 1 clarifying question about scope, constraints, and preferences.');
      lines.push('- Surface anything they may have missed: dependencies, side effects, better approaches.');
      lines.push('- Recommend mode change if complexity differs from initial assessment.');
      lines.push(t
        ? `- Enter plan mode. Create plan artifact: \`aidd_artifact { action: "create", type: "plan", sessionId: "${sid}" }\`. Exit for user approval.\n`
        : '- Enter plan mode. Create a plan. Exit for user approval.\n');
      lines.push('### Step 2 \u2014 Build');
      lines.push(t
        ? `- Execute plan. Update: \`aidd_session { action: "update", id: "${sid}", tasksCompleted: [...] }\`\n`
        : '- Execute plan.\n');
      lines.push('### Step 3 \u2014 Verify');
      lines.push(t
        ? '- Typecheck + tests + build. Create checklist artifact.\n'
        : '- Typecheck + tests + build.\n');
      lines.push('### Step 4 \u2014 Ship');
      lines.push(t
        ? `- Create retro artifact. Archive all. End: \`aidd_session { action: "end", id: "${sid}" }\``
        : '- Review results. Wrap up.');
    }
    return lines;
  }

  // --- Full BAP mode ---
  lines.push('\n## Workflow\n');
  lines.push(t
    ? `Session: \`${sid}\` | Mode: Full | Budget: ${tokenBudget}`
    : `Mode: Workflow-only (no tracking) | Full | Budget: ${tokenBudget}`);

  if (tokenBudget === 'minimal') {
    lines.push('');
    lines.push(t
      ? '1. **BAP** \u2014 Memory search \u2192 ask user \u2192 brainstorm artifact \u2192 plan artifact \u2192 approval'
      : '1. **BAP** \u2014 Explore \u2192 ask user \u2192 brainstorm \u2192 plan \u2192 approval');
    lines.push(t
      ? '2. **Build** \u2014 Execute. Update session.'
      : '2. **Build** \u2014 Execute plan.');
    lines.push('3. **Verify** \u2014 Typecheck + tests + build.');
    lines.push(t
      ? '4. **Ship** \u2014 Retro artifact \u2192 archive \u2192 end session.'
      : '4. **Ship** \u2014 Review results. Wrap up.');
    return lines;
  }

  if (tokenBudget === 'standard') {
    lines.push('\n### Step 1 \u2014 BAP (Brainstorm & Ask \u2192 Plan)\n');
    lines.push(t
      ? `- Search memory: \`aidd_memory_search { query: "..." }\`. Explore codebase.`
      : '- Search memory and explore codebase for prior context.');
    lines.push('- Ask the user questions about intent, scope, constraints, and risks. Surface what they may have missed.');
    lines.push(t
      ? `- Create brainstorm artifact: \`aidd_artifact { action: "create", type: "brainstorm", sessionId: "${sid}" }\``
      : '- Brainstorm options, trade-offs, and edge cases.');
    lines.push(t
      ? `- Enter plan mode. Create plan artifact. Exit for approval. On rejection \u2192 redo BAP.\n`
      : '- Enter plan mode. Create a plan. Exit for approval. On rejection \u2192 redo BAP.\n');
    lines.push('### Step 2 \u2014 Build');
    lines.push(t
      ? `- Execute plan. Update: \`aidd_session { action: "update", id: "${sid}", tasksCompleted: [...] }\`\n`
      : '- Execute plan.\n');
    lines.push('### Step 3 \u2014 Verify');
    lines.push(t
      ? '- Typecheck + tests + build. Create checklist artifact.\n'
      : '- Typecheck + tests + build.\n');
    lines.push('### Step 4 \u2014 Ship');
    lines.push(t
      ? `- Create retro artifact. Archive all. End: \`aidd_session { action: "end", id: "${sid}" }\``
      : '- Review results and lessons learned. Wrap up.');
    return lines;
  }

  // tokenBudget === 'full' — maximum guidance
  const questions = classification?.complexity === 'complex' ? '2+' : '2+';
  lines.push(` | Recommended questions: ${questions}\n`);
  lines.push('### Step 1 \u2014 BAP (Brainstorm & Ask \u2192 Plan)\n');
  lines.push('**Brainstorm & Ask** (interleaved \u2014 explore and ask in conversation):');
  lines.push(t
    ? `- Search memory for prior context: \`aidd_memory_search { query: "..." }\``
    : '- Search memory and explore codebase for prior context');
  lines.push('- Explore the codebase: read related files, trace code paths, understand existing patterns');
  lines.push('- Brainstorm options, trade-offs, and edge cases');
  lines.push('- Ask the user targeted questions. Assume they do NOT see the full picture. Surface:');
  lines.push('  - **Intent**: What problem are you really solving? Is there a simpler framing?');
  lines.push('  - **Scope**: What\u2019s in/out? Are there hidden dependencies or side effects?');
  lines.push('  - **Constraints**: Performance, compatibility, timeline, existing patterns to follow?');
  lines.push('  - **Risks**: What could go wrong? What assumptions are we making?');
  lines.push('  - **Alternatives**: Is there an existing solution, library, or pattern that already handles this?');
  lines.push('- Based on findings, recommend workflow mode: "I recommend [full/guided/fast-track] because..."');
  if (t) {
    lines.push(`- Create brainstorm artifact: \`aidd_artifact { action: "create", type: "brainstorm", feature: "<slug>", title: "Brainstorm: <topic>", sessionId: "${sid}", content: "## Options\\n...\\n## Trade-offs\\n...\\n## Recommendations\\n..." }\`\n`);
    lines.push('**Plan** (after alignment with user):');
    lines.push(`- Enter plan mode. Create plan artifact: \`aidd_artifact { action: "create", type: "plan", feature: "<slug>", title: "Plan: <feature>", sessionId: "${sid}" }\``);
  } else {
    lines.push('- Document your brainstorm findings (options, trade-offs, recommendations)\n');
    lines.push('**Plan** (after alignment with user):');
    lines.push('- Enter plan mode. Create a plan. Exit for user approval.');
  }
  lines.push('- Exit for user approval. On rejection \u2192 return to Brainstorm & Ask.\n');
  lines.push('### Step 2 \u2014 Build');
  lines.push('- Implement the approved plan');
  if (t) {
    lines.push(`- Update progress: \`aidd_session { action: "update", id: "${sid}", tasksCompleted: [...], filesModified: [...] }\``);
  }
  lines.push(`- For errors: \`aidd_diagnose_error { error: "..." }\`\n`);
  lines.push('### Step 3 \u2014 Verify');
  lines.push('- Run typecheck + tests + build');
  if (t) {
    lines.push(`- Create checklist: \`aidd_artifact { action: "create", type: "checklist", sessionId: "${sid}", content: "- [ ] typecheck\\n- [ ] tests\\n- [ ] build" }\``);
  }
  lines.push('- If checks fail \u2192 return to Build\n');
  lines.push('### Step 4 \u2014 Ship');
  if (t) {
    lines.push(`- Create retro: \`aidd_artifact { action: "create", type: "retro", sessionId: "${sid}", content: "## What worked\\n...\\n## What didn\\'t\\n...\\n## Lessons\\n..." }\``);
    lines.push(`- Archive all artifacts: \`aidd_artifact { action: "archive", id: "..." }\``);
    lines.push('- Record permanent memory if significant: `aidd_memory_add_decision` / `aidd_memory_add_mistake` / `aidd_memory_add_convention`');
    lines.push(`- End: \`aidd_session { action: "end", id: "${sid}", outcome: { testsPassing: true, complianceScore: 90, reverts: 0, reworks: 0 } }\``);
  } else {
    lines.push('- Review results and lessons learned.');
    lines.push('- Wrap up the session.');
  }

  return lines;
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
        tokenBudget: z
          .enum(['minimal', 'standard', 'full'])
          .optional()
          .describe('Token usage level. Controls response verbosity and workflow ceremony. Default from config.'),
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
          nature?: string;
          complexity?: string;
          fastTrack?: boolean;
          skippableStages?: string[];
        } | undefined;
        const configBudget = liveConfig.content.tokenBudget ?? 'standard';
        const paramBudget = a['tokenBudget'] as TokenBudget | undefined;
        const tokenBudget: TokenBudget = paramBudget ?? configBudget;

        const sessionTracking = liveConfig.content.sessionTracking; // undefined | true | false

        const sections: string[] = [];

        // =================================================================
        // 0. Setup prompt — when sessionTracking is not configured
        // =================================================================
        if (sessionTracking === undefined) {
          sections.push('[[aidd.md]](https://aidd.md) Engine - ON');
          sections.push('- **Session**: pending setup\n');

          if (info.stack.name) {
            sections.push(`- **Package**: ${info.stack.name}${info.stack.version ? ` v${info.stack.version}` : ''}`);
          }
          const deps = Object.keys(info.stack.dependencies);
          if (deps.length > 0) {
            const topDeps = deps.slice(0, 15).join(', ');
            sections.push(`- **Dependencies** (${deps.length}): ${topDeps}${deps.length > 15 ? '...' : ''}`);
          }

          sections.push('\n## Setup Required\n');
          sections.push('AIDD preferences are not configured yet. Ask the user:\n');
          sections.push('1. **Session tracking**: Full tracking (sessions, artifacts, observations saved to DB) or Workflow-only (follow AIDD workflow steps without DB persistence)?');
          sections.push('2. **Token budget**: Minimal (~400 tok), Standard (~600 tok), or Full (~800+ tok)?\n');
          sections.push('After the user answers:');
          sections.push('1. Save preferences to `.aidd/config.json` — set `content.sessionTracking` (boolean) and `content.tokenBudget` (string)');
          sections.push('2. Call `aidd_start` again to initialize the workflow.');

          return createTextResult(sections.join('\n'));
        }

        // =================================================================
        // 1. Auto-start session via cross-module service
        // =================================================================
        let sessionId: string | null = null;
        const startSession = context.services['startSession'];

        if (sessionTracking && startSession) {
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

        if (!sessionTracking) {
          sections.push('- **Session**: workflow-only (no tracking)');
        } else if (sessionId) {
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
        // 4. PAPI: Pre-emptive mistake injection (requires DB — skip when not tracking)
        // =================================================================
        const queryMistakes = context.services['queryDomainMistakes'] as
          ((domain: string, limit: number) => Promise<Array<{ error: string; fix: string }>>) | undefined;
        if (sessionTracking && queryMistakes && classification?.domain) {
          try {
            const hazards = await queryMistakes(classification.domain, 3);
            if (hazards.length > 0) {
              sections.push('\n## Hazards to Avoid\n');
              for (const h of hazards) {
                sections.push(`- **${h.error}** → ${h.fix}`);
              }
            }
          } catch (err) {
            context.logger.warn('Failed to query domain mistakes for PAPI hazard injection', err);
          }
        }

        // =================================================================
        // 4b. Workflow Pipeline (both slim and full)
        // =================================================================
        const pipelineLines = buildWorkflowPipeline(sessionId, classification, tokenBudget, sessionTracking);
        sections.push(...pipelineLines);

        if (tokenBudget === 'minimal') {
          // =============================================================
          // MINIMAL: Guardrails + compressed content (titles only)
          // =============================================================
          sections.push('\n## Guardrails\n');
          sections.push('- No `any` without exception. No secrets. ES modules only.');

          if (index.agents.length > 0 || index.rules.length > 0) {
            sections.push(
              `\n*${index.agents.length} agents, ${index.rules.length} rules available — use \`aidd_get_agent\`, \`aidd_get_routing_table\`*`,
            );
          }

          if (!info.detected) {
            sections.push('\n**Setup**: `aidd_scaffold { preset: "standard" }`');
          }
        } else if (tokenBudget === 'standard') {
          // =============================================================
          // STANDARD: Agents, rules (MUST lines), title lists
          // =============================================================

          // 5. Agents (SSOT) — routing.md content
          if (index.agents.length > 0) {
            sections.push('\n## Agents (SSOT)\n');
            const mainAgent = index.agents.find((ag) => ag.name === 'routing.md') ?? index.agents[0]!;
            sections.push(mainAgent.getContent());
            if (index.agents.length > 1) {
              sections.push(`\n*${index.agents.length} agent files available — use \`aidd_get_agent\` for individual agents*`);
            }
          }

          // 6. Active Rules — MUST/NEVER lines only
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

          // 7. Workflows — title list
          if (index.workflows.length > 0) {
            sections.push('\n## Workflows\n');
            for (const wf of index.workflows) {
              const title = wf.frontmatter['title'] ?? wf.name.replace('.md', '');
              sections.push(`- ${title}`);
            }
          }

          // 8. Skills — title list
          if (index.skills.length > 0) {
            sections.push('\n## Skills\n');
            for (const skill of index.skills) {
              const title = skill.frontmatter['title'] ?? skill.name.replace('.md', '');
              sections.push(`- ${title}`);
            }
          }

          // 9. Specs — title list
          if (index.specs.length > 0) {
            sections.push('\n## Specs\n');
            for (const spec of index.specs) {
              const title = spec.frontmatter['title'] ?? spec.name.replace('.md', '');
              sections.push(`- ${title}`);
            }
          }

          // 10. Knowledge (TKB) — title list
          if (index.knowledge.length > 0) {
            sections.push('\n## Knowledge (TKB)\n');
            for (const entry of index.knowledge) {
              const name = entry.frontmatter['name'] ?? entry.name.replace('.md', '');
              sections.push(`- ${name}`);
            }
          }

          // 11. Templates — title list
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
        } else {
          // =============================================================
          // FULL: Everything with descriptions + extra hints
          // =============================================================

          // 5. Agents (SSOT) — full routing.md content + per-agent hints
          if (index.agents.length > 0) {
            sections.push('\n## Agents (SSOT)\n');
            const mainAgent = index.agents.find((ag) => ag.name === 'routing.md') ?? index.agents[0]!;
            sections.push(mainAgent.getContent());
            if (index.agents.length > 1) {
              sections.push(`\n*${index.agents.length} agent files available — use \`aidd_get_agent\` for individual agents*`);
            }
          }

          // 6. Active Rules — MUST lines + examples
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
                .slice(0, 5);
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

        // Fire-and-forget: update session with timing metrics (skip when not tracking)
        const updateTiming = context.services['updateSessionTiming'] as
          ((id: string, ms: number) => Promise<void>) | undefined;
        if (sessionTracking && sessionId && updateTiming) {
          updateTiming(sessionId, startupMs).catch(() => {});
        }

        return createTextResult(sections.join('\n'));
      },
    });
  },
};
