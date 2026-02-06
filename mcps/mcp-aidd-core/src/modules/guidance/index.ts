import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  createTextResult,
  createErrorResult,
  extractSection,
  extractSections,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ModuleContext } from '@aidd.md/mcp-shared';
import type { ContentLoader } from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// ---------------------------------------------------------------------------
// Heuristics Parser
// ---------------------------------------------------------------------------

interface Heuristic {
  id: string;
  name: string;
  definition: string;
  rationale: string;
  application: string;
  example: string;
}

let heuristicsCache: Heuristic[] | null = null;

function loadHeuristics(contentLoader: ContentLoader): void {
  if (heuristicsCache) return;

  const specs = contentLoader.getIndex().spec;
  const heuristicsEntry = specs.find((s) => s.name === 'heuristics.md');

  if (!heuristicsEntry) {
    heuristicsCache = [];
    return;
  }

  const content = heuristicsEntry.getContent();
  heuristicsCache = [];

  // Extract heuristic definitions section
  const defsSection = extractSection(content, '2. Heuristic Definitions');
  const hSections = extractSections(defsSection, 3);

  for (const section of hSections) {
    const headerMatch = section.heading.match(/^(H\d+)\s*[\u2014\-\u2013]+\s*(.+)$/);
    if (!headerMatch) continue;

    const id = headerMatch[1]!;
    const name = headerMatch[2]!.trim();

    const definition = extractBoldField(section.content, 'Definition');
    const rationale = extractBoldField(section.content, 'Rationale');
    const application = extractBoldField(section.content, 'Application');
    const example = extractBoldField(section.content, 'Example');

    heuristicsCache.push({ id, name, definition, rationale, application, example });
  }
}

function extractBoldField(text: string, field: string): string {
  const pattern = new RegExp(`\\*\\*${field}\\*\\*:\\s*(.+?)(?=\\n\\n|\\n\\*\\*|$)`, 's');
  const match = pattern.exec(text);
  return match?.[1]?.trim() ?? '';
}

function getRelevantHeuristicIds(stakes: string): string[] {
  const stakesMap: Record<string, string[]> = {
    catastrophic: ['H1', 'H6', 'H7', 'H2', 'H9'],
    high: ['H1', 'H2', 'H6', 'H4', 'H3'],
    medium: ['H2', 'H3', 'H4', 'H9', 'H7'],
    low: ['H3', 'H4', 'H5', 'H8'],
  };
  return stakesMap[stakes] ?? stakesMap['medium']!;
}

// ---------------------------------------------------------------------------
// TKB compact access (for tech_compatibility)
// ---------------------------------------------------------------------------

interface TkbCompactEntry {
  name: string;
  category: string;
  maturity: string;
}

function getTkbEntries(contentLoader: ContentLoader): TkbCompactEntry[] {
  const knowledge = contentLoader.getIndex().knowledge;
  return knowledge.map((entry) => ({
    name: entry.frontmatter['name'] ?? entry.name.replace('.md', ''),
    category: entry.frontmatter['category'] ?? 'uncategorized',
    maturity: entry.frontmatter['maturity'] ?? 'unknown',
  }));
}

function checkCompatibility(
  a: TkbCompactEntry,
  b: TkbCompactEntry,
): { level: string; notes: string } {
  if (a.category === b.category && a.category !== 'pattern') {
    return {
      level: 'low',
      notes: `Both in "${a.category}" category — likely alternatives, choose one`,
    };
  }

  const maturityOrder = ['deprecated', 'experimental', 'emerging', 'stable'];
  const aIdx = maturityOrder.indexOf(a.maturity);
  const bIdx = maturityOrder.indexOf(b.maturity);

  if (Math.abs(aIdx - bIdx) >= 2) {
    return {
      level: 'medium',
      notes: `Maturity mismatch: ${a.name} is ${a.maturity}, ${b.name} is ${b.maturity}`,
    };
  }

  if (a.maturity === 'deprecated' || b.maturity === 'deprecated') {
    return {
      level: 'low',
      notes: `${a.maturity === 'deprecated' ? a.name : b.name} is deprecated`,
    };
  }

  return {
    level: 'high',
    notes: `${a.category} + ${b.category} — complementary categories`,
  };
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const guidanceModule: AiddModule = {
  name: 'guidance',
  description: 'Decision heuristics, next-step suggestions, and technology compatibility analysis',

  register(server: McpServer, context: ModuleContext) {
    // -----------------------------------------------------------------------
    // Resource: aidd://specs/heuristics
    // -----------------------------------------------------------------------
    server.registerResource(
      'heuristics',
      'aidd://specs/heuristics',
      { description: 'AIDD operating heuristics (10 decision principles)', mimeType: 'text/markdown' },
      async (uri) => {
        const specs = context.contentLoader.getIndex().spec;
        const entry = specs.find((s) => s.name === 'heuristics.md');
        const content = entry ? entry.getContent() : 'Heuristics spec not found. Use aidd_scaffold to initialize.';
        return { contents: [{ uri: uri.href, text: content, mimeType: 'text/markdown' }] };
      },
    );

    // -----------------------------------------------------------------------
    // Prompt: aidd_plan_task (BLUF-6 task planning)
    // -----------------------------------------------------------------------
    server.registerPrompt(
      'aidd_plan_task',
      {
        title: 'Plan Task (BLUF-6)',
        description: 'Plan a task using the BLUF-6 framework: Bottom Line Up Front, Situational Analysis, Trade-off Matrix, Optimal Path, Black Swans, Unknown Factors.',
        argsSchema: {
          task: z.string().describe('The task or feature to plan'),
          stakes: z.enum(['low', 'medium', 'high', 'catastrophic']).optional().describe('Decision stakes level'),
        },
      },
      async (args) => {
        const stakes = args.stakes ?? 'medium';

        loadHeuristics(context.contentLoader);
        const relevantIds = getRelevantHeuristicIds(stakes);
        const heuristicNames = (heuristicsCache ?? [])
          .filter((h) => relevantIds.includes(h.id))
          .map((h) => `${h.id} ${h.name}`)
          .join(', ');

        const rulesIndex = context.contentLoader.getIndex().rules;
        const ruleNames = rulesIndex
          .map((r) => r.frontmatter['title'] ?? r.name.replace('.md', ''))
          .join(', ');

        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: [
                `# Task Planning — BLUF-6`,
                '',
                `**Task**: ${args.task}`,
                `**Stakes**: ${stakes}`,
                `**Relevant heuristics**: ${heuristicNames || 'none loaded'}`,
                `**Active rules**: ${ruleNames || 'none'}`,
                '',
                'Plan this task using the BLUF-6 structure:',
                '',
                '1. **Bottom Line**: What is the single most important outcome?',
                '2. **Situational Analysis**: Current state, constraints, dependencies',
                '3. **Trade-off Matrix**: Options with pros/cons (at least 2)',
                '4. **Optimal Path**: Recommended approach with justification',
                '5. **Black Swans**: What could go catastrophically wrong?',
                '6. **Unknown Factors**: What information is missing?',
                '',
                'Then provide:',
                '- Atomic task breakdown (files to create/modify)',
                '- Complexity estimate per task (Low/Medium/High)',
                '- Suggested agent assignment per task',
              ].join('\n'),
            },
          }],
        };
      },
    );

    // -----------------------------------------------------------------------
    // Prompt: aidd_review_code (rule-based review)
    // -----------------------------------------------------------------------
    server.registerPrompt(
      'aidd_review_code',
      {
        title: 'Code Review (Rule-Based)',
        description: 'Review code against the active AIDD rules and heuristics.',
        argsSchema: {
          code: z.string().describe('The code to review (or file path)'),
          context: z.string().optional().describe('Additional context about the code purpose'),
        },
      },
      async (args) => {
        const rulesIndex = context.contentLoader.getIndex().rules;
        const rulesContent = rulesIndex
          .map((r) => {
            const title = r.frontmatter['title'] ?? r.name.replace('.md', '');
            const body = r.getContent().slice(0, 500);
            return `### ${title}\n${body}`;
          })
          .join('\n\n');

        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: [
                '# Code Review — AIDD Rules',
                '',
                args.context ? `**Context**: ${args.context}\n` : '',
                '## Active Rules',
                '',
                rulesContent || 'No rules loaded.',
                '',
                '## Code to Review',
                '',
                '```',
                args.code,
                '```',
                '',
                'Review the code above against the active rules. For each violation:',
                '1. Cite the specific rule',
                '2. Quote the offending code',
                '3. Provide the fix',
                '',
                'Also check for:',
                '- Security vulnerabilities (OWASP Top 10)',
                '- TypeScript strict mode compliance',
                '- Evidence-first: no magic strings/numbers',
                '- Negative simplicity: remove unnecessary code',
              ].join('\n'),
            },
          }],
        };
      },
    );

    // -----------------------------------------------------------------------
    // Prompt: aidd_start_feature (ASDD lifecycle)
    // -----------------------------------------------------------------------
    server.registerPrompt(
      'aidd_start_feature',
      {
        title: 'Start Feature (ASDD)',
        description: 'Guide through the AI-Spec-Driven Development lifecycle for a new feature.',
        argsSchema: {
          feature: z.string().describe('Feature description'),
          phase: z.enum(['planning', 'design', 'implementation', 'testing', 'release']).optional().describe('Starting phase'),
        },
      },
      async (args) => {
        const info = context.projectInfo;
        const stack = Object.keys(info.stack.dependencies).slice(0, 10).join(', ');

        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: [
                '# Feature Development — ASDD Lifecycle',
                '',
                `**Feature**: ${args.feature}`,
                `**Starting Phase**: ${args.phase ?? 'planning'}`,
                `**Project Stack**: ${stack || 'unknown'}`,
                `**AIDD Active**: ${info.detected}`,
                '',
                '## ASDD Phases',
                '',
                '### Phase 1: Planning',
                '- Analyze requirements, ask clarifying questions if confidence < 90%',
                '- Check codebase for similar features',
                '- Use `aidd_classify_task` to route to the right agents',
                '',
                '### Phase 2: User Story',
                '- As a [user], I want [goal], so that [benefit]',
                '- Given/When/Then acceptance criteria',
                '',
                '### Phase 3: Detailed Plan',
                '- Atomic tasks with files to create/modify',
                '- Use `aidd_apply_heuristics` for design decisions',
                '- Complexity per task (Low/Medium/High)',
                '',
                '### Phase 4: Implementation',
                '- Follow plan strictly',
                '- Use `aidd_get_agent` for domain-specific guidance',
                '- Run targeted tests after each change',
                '',
                '### Phase 5: Testing',
                '- Write/update tests matching acceptance criteria',
                '- Use `aidd_tech_compatibility` to verify stack choices',
                '',
                '### Phase 6: Release',
                '- Full check: typecheck + lint + test',
                '- Spec matches implementation (update if diverged)',
                '',
                `Start from the **${args.phase ?? 'planning'}** phase for: "${args.feature}"`,
              ].join('\n'),
            },
          }],
        };
      },
    );

    // -----------------------------------------------------------------------
    // aidd_apply_heuristics
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_apply_heuristics',
      description:
        "Run a decision through AIDD's 10 operating heuristics (Zero Trust, First Principles, Pareto, Occam's Razor, etc.). Returns analysis per relevant heuristic.",
      schema: {
        decision: z.string().describe('The decision or problem statement to analyze'),
        context: z.string().optional().describe('Additional context about constraints or environment'),
        stakes: z
          .enum(['low', 'medium', 'high', 'catastrophic'])
          .optional()
          .default('medium')
          .describe('Decision stakes level — determines which heuristics are prioritized'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const { decision, context: decisionContext, stakes } = args as {
          decision: string;
          context?: string;
          stakes: string;
        };

        loadHeuristics(context.contentLoader);

        if (!heuristicsCache || heuristicsCache.length === 0) {
          return createErrorResult(
            'Heuristics file (specs/heuristics.md) not found. Use aidd_scaffold to initialize.',
          );
        }

        const relevantIds = getRelevantHeuristicIds(stakes);
        const relevant = heuristicsCache.filter((h) => relevantIds.includes(h.id));

        const lines: string[] = [
          '# Heuristic Analysis\n',
          `**Decision**: ${decision}`,
        ];

        if (decisionContext) {
          lines.push(`**Context**: ${decisionContext}`);
        }

        lines.push(`**Stakes**: ${stakes}`);
        lines.push(`**Relevant heuristics**: ${relevantIds.join(', ')}\n`);
        lines.push('---\n');

        for (const h of relevant) {
          lines.push(`## ${h.id} — ${h.name}\n`);
          lines.push(`**Definition**: ${h.definition}\n`);
          lines.push(`**Application**: ${h.application}\n`);
          lines.push(`**How it applies**: Consider applying ${h.name} to: "${decision.slice(0, 80)}"\n`);
        }

        lines.push('---\n');
        lines.push('## Recommendation\n');

        const recommendations: Record<string, string> = {
          catastrophic: 'At **catastrophic** stakes, prioritize **Zero Trust** (verify all assumptions) and **Lean Antifragility** (ensure system improves under failure). Do not proceed without evidence-based validation.',
          high: 'At **high** stakes, apply **First Principles** decomposition before committing. Use **Pareto** to identify the 20% of factors driving 80% of risk.',
          medium: "At **medium** stakes, balance **First Principles** analysis with **Occam's Razor** simplicity. Avoid premature optimization.",
          low: "At **low** stakes, favor **Occam's Razor** (simplest solution) and **Pareto** (focus on high-impact items). Avoid over-engineering.",
        };
        lines.push(recommendations[stakes] ?? recommendations['medium']!);

        return createTextResult(lines.join('\n'));
      },
    });

    // -----------------------------------------------------------------------
    // aidd_suggest_next
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_suggest_next',
      description:
        'Get context-aware suggestions for the next action. Returns tool calls with pre-filled arguments based on current state.',
      schema: {
        currentTask: z.string().optional().describe('What you are currently working on'),
        phase: z.string().optional().describe('Current ASDD phase (DESIGN, IMPLEMENTATION, QUALITY, RELEASE)'),
        recentActions: z.array(z.string()).optional().describe('Recent tool names or actions taken'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const { currentTask, phase, recentActions } = args as {
          currentTask?: string;
          phase?: string;
          recentActions?: string[];
        };

        const suggestions: Array<{
          action: string;
          tool: string;
          args: Record<string, unknown>;
          reason: string;
        }> = [];

        const recentSet = new Set(recentActions ?? []);
        const info = context.projectInfo;

        if (!info.detected) {
          suggestions.push({
            action: 'Initialize AIDD framework',
            tool: 'aidd_scaffold',
            args: { preset: 'standard' },
            reason: 'AIDD not detected in this project',
          });
        }

        if (!currentTask) {
          if (!recentSet.has('aidd_bootstrap')) {
            suggestions.push({
              action: 'Bootstrap conversation context',
              tool: 'aidd_bootstrap',
              args: {},
              reason: 'Start every conversation with project context',
            });
          }
          suggestions.push({
            action: 'Classify your task',
            tool: 'aidd_classify_task',
            args: { description: '' },
            reason: 'Determine optimal agents and workflows',
          });
        } else {
          const upperPhase = (phase ?? 'IMPLEMENTATION').toUpperCase();

          if (upperPhase === 'DESIGN') {
            suggestions.push({
              action: 'Apply heuristics to your design decision',
              tool: 'aidd_apply_heuristics',
              args: { decision: currentTask, stakes: 'high' },
              reason: 'Validate design decisions through systematic heuristics',
            });
            suggestions.push({
              action: 'Explore relevant technologies',
              tool: 'aidd_query_tkb',
              args: {},
              reason: 'Research technology options before committing',
            });
          }

          if (upperPhase === 'IMPLEMENTATION') {
            suggestions.push({
              action: 'Get agent guidance for implementation',
              tool: 'aidd_get_agent',
              args: { agent: '' },
              reason: 'Load the specialized agent skill for your domain',
            });
            suggestions.push({
              action: 'Check technology compatibility',
              tool: 'aidd_tech_compatibility',
              args: { technologies: [] },
              reason: 'Verify your stack choices are compatible',
            });
          }

          if (upperPhase === 'QUALITY') {
            suggestions.push({
              action: 'Review competency matrix',
              tool: 'aidd_get_competency_matrix',
              args: {},
              reason: 'Find the right agent for quality review',
            });
          }

          if (upperPhase === 'RELEASE') {
            suggestions.push({
              action: 'Get routing guidance for deployment',
              tool: 'aidd_classify_task',
              args: { description: 'deploy and release', phase: 'RELEASE' },
              reason: 'Route to Platform Engineer',
            });
          }
        }

        if (!recentSet.has('aidd_optimize_context')) {
          suggestions.push({
            action: 'Get optimized context for AI',
            tool: 'aidd_optimize_context',
            args: { budget: 4000 },
            reason: 'Token-efficient context injection',
          });
        }

        return createJsonResult(suggestions.slice(0, 5));
      },
    });

    // -----------------------------------------------------------------------
    // aidd_tech_compatibility
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_tech_compatibility',
      description:
        'Analyze compatibility between technologies. Checks for conflicts, maturity mismatches, and known pairings using the TKB.',
      schema: {
        technologies: z
          .array(z.string())
          .describe('Technology names to analyze (e.g., ["react", "vue", "tailwind"])'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const { technologies } = args as { technologies: string[] };

        if (technologies.length < 2) {
          return createErrorResult('Provide at least 2 technologies to compare.');
        }

        const tkbEntries = getTkbEntries(context.contentLoader);
        const resolved: Array<TkbCompactEntry & { original: string }> = [];
        const unresolved: string[] = [];

        for (const tech of technologies) {
          const lower = tech.toLowerCase();
          const found = tkbEntries.find(
            (e) =>
              e.name.toLowerCase() === lower ||
              e.name.toLowerCase().includes(lower),
          );
          if (found) {
            resolved.push({ ...found, original: tech });
          } else {
            unresolved.push(tech);
          }
        }

        const lines: string[] = ['# Technology Compatibility Analysis\n'];

        if (unresolved.length > 0) {
          lines.push(`**Note**: Not found in TKB: ${unresolved.join(', ')}\n`);
        }

        if (resolved.length < 2) {
          lines.push('Not enough technologies found in TKB for comparison.');
          return createTextResult(lines.join('\n'));
        }

        lines.push('| Tech A | Tech B | Compatibility | Notes |');
        lines.push('|--------|--------|---------------|-------|');

        for (let i = 0; i < resolved.length; i++) {
          for (let j = i + 1; j < resolved.length; j++) {
            const a = resolved[i]!;
            const b = resolved[j]!;
            const { level, notes } = checkCompatibility(a, b);
            const icon = level === 'high' ? '\u2705' : level === 'medium' ? '\u26A0\uFE0F' : '\u274C';
            lines.push(`| ${a.name} | ${b.name} | ${icon} ${level} | ${notes} |`);
          }
        }

        lines.push('\n## Maturity Summary\n');
        for (const tech of resolved) {
          lines.push(`- **${tech.name}**: ${tech.maturity} (${tech.category})`);
        }

        return createTextResult(lines.join('\n'));
      },
    });
  },
};
