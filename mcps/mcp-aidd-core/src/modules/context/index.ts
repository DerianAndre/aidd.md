import { z } from 'zod';
import {
  registerTool,
  createTextResult,
  estimateTokens,
  truncateToTokens,
  DEFAULT_CONTEXT_BUDGET,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ModuleContext, ContextBudget } from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// ---------------------------------------------------------------------------
// ContextBuilder
// ---------------------------------------------------------------------------

interface ContextSection {
  name: string;
  content: string;
  priority: number;
  tokens: number;
}

class ContextBuilder {
  private sections: ContextSection[] = [];

  addSection(name: string, content: string, priority: number): void {
    if (!content || content.trim().length === 0) return;
    const tokens = estimateTokens(content);
    this.sections.push({ name, content, priority, tokens });
  }

  build(budget: ContextBudget): string {
    // Sort by priority (lower = higher priority)
    const sorted = [...this.sections].sort((a, b) => a.priority - b.priority);
    const maxTokens = budget.totalTokens - budget.reserveTokens;

    let allocated = 0;
    const output: string[] = [];

    for (const section of sorted) {
      const available = maxTokens - allocated;
      if (available <= 50) break; // Not enough space for meaningful content

      if (section.tokens <= available) {
        // Fits fully
        output.push(`## ${section.name}\n\n${section.content}`);
        allocated += section.tokens;
      } else if (available > 100) {
        // Truncate to fit
        const truncated = truncateToTokens(section.content, available - 20);
        output.push(`## ${section.name}\n\n${truncated}`);
        allocated += available;
      }
    }

    const header = `# AIDD Context (${allocated} tokens / ${budget.totalTokens} budget)\n`;
    return header + '\n' + output.join('\n\n---\n\n');
  }
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const contextModule: AiddModule = {
  name: 'context',
  description: 'Token-budget-aware context optimization for AI conversations',

  register(server: McpServer, context: ModuleContext) {
    registerTool(server, {
      name: 'aidd_optimize_context',
      description:
        'Generate an optimized context block within a token budget. Uses progressive disclosure to include the most important information first. Call this to get a compact project summary for AI context injection.',
      schema: {
        budget: z
          .number()
          .optional()
          .default(4000)
          .describe('Total token budget (default: 4000)'),
        sections: z
          .array(z.string())
          .optional()
          .describe('Specific sections to include (header, rules, agents, suggestions). Omit for all.'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const { budget: totalBudget, sections: requestedSections } = args as {
          budget: number;
          sections?: string[];
        };

        const budgetConfig: ContextBudget = {
          ...DEFAULT_CONTEXT_BUDGET,
          totalTokens: totalBudget,
        };

        const builder = new ContextBuilder();
        const index = context.contentLoader.getIndex();
        const info = context.projectInfo;
        const includeAll = !requestedSections || requestedSections.length === 0;

        // Priority 1: Project header
        if (includeAll || requestedSections?.includes('header')) {
          const headerLines: string[] = [];
          headerLines.push(`**Project**: ${info.stack.name ?? 'Unknown'} ${info.stack.version ?? ''}`);
          headerLines.push(`**AIDD**: ${info.detected ? 'Active' : 'Not detected'}`);
          headerLines.push(`**Root**: \`${info.root}\``);

          const deps = Object.keys(info.stack.dependencies);
          if (deps.length > 0) {
            headerLines.push(`**Stack**: ${deps.slice(0, 10).join(', ')}`);
          }

          const markers = Object.entries(info.markers)
            .filter(([, v]) => v)
            .map(([k]) => k);
          if (markers.length > 0) {
            headerLines.push(`**AIDD markers**: ${markers.join(', ')}`);
          }

          builder.addSection('Project', headerLines.join('\n'), 1);
        }

        // Priority 2: Active rules
        if (includeAll || requestedSections?.includes('rules')) {
          if (index.rules.length > 0) {
            const rulesList = index.rules
              .map((r) => `- ${r.frontmatter['title'] ?? r.name.replace('.md', '')}`)
              .join('\n');
            builder.addSection('Active Rules', rulesList, 2);
          }
        }

        // Priority 3: Agents summary
        if (includeAll || requestedSections?.includes('agents')) {
          if (index.agents.length > 0) {
            // Prefer routing.md as the main agents file, fall back to first entry
            const mainAgent = index.agents.find((a) => a.name === 'routing.md') ?? index.agents[0]!;
            const agentsContent = mainAgent.getContent();
            // Take first ~40 lines for summary
            const summary = agentsContent.split('\n').slice(0, 40).join('\n');
            builder.addSection('Agents (SSOT)', summary, 3);
          }
        }

        // Priority 4: Content inventory
        if (includeAll) {
          const inventoryLines: string[] = [];
          if (index.skills.length > 0) inventoryLines.push(`- ${index.skills.length} skills available`);
          if (index.workflows.length > 0) inventoryLines.push(`- ${index.workflows.length} workflows`);
          if (index.knowledge.length > 0) inventoryLines.push(`- ${index.knowledge.length} TKB entries`);
          if (index.templates.length > 0) inventoryLines.push(`- ${index.templates.length} templates`);
          if (index.specs.length > 0) inventoryLines.push(`- ${index.specs.length} specifications`);

          if (inventoryLines.length > 0) {
            builder.addSection('Content Inventory', inventoryLines.join('\n'), 4);
          }
        }

        // Priority 5: Suggestions
        if (includeAll || requestedSections?.includes('suggestions')) {
          const suggestionLines = [
            '- Classify task: `aidd_classify_task`',
            '- Query TKB: `aidd_query_tkb`',
            '- Apply heuristics: `aidd_apply_heuristics`',
            '- Get agent: `aidd_get_agent`',
          ];
          builder.addSection('Available Tools', suggestionLines.join('\n'), 5);
        }

        const result = builder.build(budgetConfig);
        return createTextResult(result);
      },
    });
  },
};
