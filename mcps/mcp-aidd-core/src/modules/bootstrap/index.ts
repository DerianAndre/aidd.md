import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  createTextResult,
  detectProject,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ModuleContext } from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const bootstrapModule: AiddModule = {
  name: 'bootstrap',
  description: 'Project detection, configuration, and conversation bootstrapping',

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
        return createJsonResult(context.config);
      },
    });

    // -----------------------------------------------------------------------
    // Resource: aidd://agents
    // -----------------------------------------------------------------------
    server.registerResource(
      'agents',
      'aidd://agents',
      { description: 'AGENTS.md — Single Source of Truth for agent roles', mimeType: 'text/markdown' },
      async (uri) => {
        const agentsEntry = context.contentLoader.getIndex().agents;
        const content = agentsEntry ? agentsEntry.getContent() : 'AGENTS.md not found. Use aidd_scaffold to initialize.';
        return { contents: [{ uri: uri.href, text: content, mimeType: 'text/markdown' }] };
      },
    );

    // -----------------------------------------------------------------------
    // aidd_bootstrap
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_bootstrap',
      description:
        'One-call conversation starter: returns project detection, agent summary, active rules, and suggested next steps. Call this at the beginning of every conversation.',
      schema: {
        path: z
          .string()
          .optional()
          .describe('Project path to bootstrap from. Defaults to detected project root.'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const projectPath = (args as { path?: string }).path;
        const info = projectPath ? detectProject(projectPath) : context.projectInfo;
        const index = context.contentLoader.getIndex();

        const sections: string[] = [];

        // --- Project Detection ---
        sections.push('# AIDD Context\n');
        sections.push('## Project Detection\n');
        sections.push(`- **AIDD Detected**: ${info.detected ? 'Yes' : 'No'}`);
        sections.push(`- **Root**: \`${info.root}\``);
        sections.push(`- **AIDD Root**: \`${info.aiddRoot}\``);

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

        // --- Agents Summary ---
        if (index.agents) {
          sections.push('\n## Agents (SSOT)\n');
          const agentsContent = index.agents.getContent();
          // Show first ~30 lines (agent definitions overview)
          const agentsLines = agentsContent.split('\n').slice(0, 30);
          sections.push(agentsLines.join('\n'));
          if (agentsContent.split('\n').length > 30) {
            sections.push('\n*[Use `aidd_get_agent` or `aidd_get_competency_matrix` for full details]*');
          }
        }

        // --- Active Rules ---
        if (index.rules.length > 0) {
          sections.push('\n## Active Rules\n');
          for (const rule of index.rules) {
            const label = rule.frontmatter['title'] ?? rule.name.replace('.md', '');
            sections.push(`- ${label}`);
          }
        }

        // --- Content Summary ---
        const contentSummary: string[] = [];
        if (index.skills.length > 0) contentSummary.push(`${index.skills.length} skills`);
        if (index.workflows.length > 0) contentSummary.push(`${index.workflows.length} workflows`);
        if (index.knowledge.length > 0) contentSummary.push(`${index.knowledge.length} TKB entries`);
        if (index.templates.length > 0) contentSummary.push(`${index.templates.length} templates`);
        if (index.specs.length > 0) contentSummary.push(`${index.specs.length} specs`);

        if (contentSummary.length > 0) {
          sections.push(`\n## Content Available\n`);
          sections.push(contentSummary.join(' | '));
        }

        // --- Suggestions ---
        sections.push('\n## Suggested Next Steps\n');
        if (!info.detected) {
          sections.push('1. **Initialize AIDD**: `aidd_scaffold { preset: "standard" }`');
          sections.push('2. **Classify your task**: `aidd_classify_task { description: "..." }`');
        } else {
          sections.push('1. **Classify your task**: `aidd_classify_task { description: "..." }`');
          sections.push('2. **Explore technologies**: `aidd_query_tkb { category: "..." }`');
          sections.push('3. **Apply heuristics**: `aidd_apply_heuristics { decision: "..." }`');
          sections.push('4. **Get optimal context**: `aidd_optimize_context`');
        }

        return createTextResult(sections.join('\n'));
      },
    });
  },
};
