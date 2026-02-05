import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  createTextResult,
  createErrorResult,
  parseFrontmatter,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ModuleContext } from '@aidd.md/mcp-shared';
import type { ContentLoader } from '@aidd.md/mcp-shared';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// ---------------------------------------------------------------------------
// TKB Index (cached)
// ---------------------------------------------------------------------------

interface TkbIndexEntry {
  name: string;
  category: string;
  maturity: string;
  lastUpdated: string;
  path: string;
  summary: string;
}

let tkbCache: TkbIndexEntry[] | null = null;

function buildTkbIndex(contentLoader: ContentLoader): TkbIndexEntry[] {
  if (tkbCache) return tkbCache;

  const knowledge = contentLoader.getIndex().knowledge;
  tkbCache = knowledge.map((entry) => {
    const body = entry.getContent();
    const { body: bodyText } = parseFrontmatter(body);
    const summary = bodyText.replace(/^#.*$/m, '').trim().slice(0, 150);

    return {
      name: entry.frontmatter['name'] ?? entry.name.replace('.md', ''),
      category: entry.frontmatter['category'] ?? 'uncategorized',
      maturity: entry.frontmatter['maturity'] ?? 'unknown',
      lastUpdated: entry.frontmatter['last_updated'] ?? '',
      path: entry.path,
      summary,
    };
  });

  return tkbCache;
}

function findTkbEntry(
  contentLoader: ContentLoader,
  name: string,
): TkbIndexEntry | undefined {
  const index = buildTkbIndex(contentLoader);
  const lower = name.toLowerCase();
  return (
    index.find((e) => e.name.toLowerCase() === lower) ??
    index.find((e) => e.name.toLowerCase().includes(lower))
  );
}

function suggestSimilar(contentLoader: ContentLoader, name: string): string[] {
  const index = buildTkbIndex(contentLoader);
  const lower = name.toLowerCase();
  return index
    .filter(
      (e) =>
        e.name.toLowerCase().includes(lower) ||
        lower.includes(e.name.toLowerCase()),
    )
    .slice(0, 5)
    .map((e) => e.name);
}

// ---------------------------------------------------------------------------
// Agent/Skill parsing
// ---------------------------------------------------------------------------

interface AgentEntry {
  name: string;
  emoji: string;
  purpose: string;
  skills: string;
  activation: string;
}

function parseAgents(agentsContent: string): AgentEntry[] {
  const agents: AgentEntry[] = [];
  const pattern = /^###\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  const headings: Array<{ raw: string; index: number }> = [];

  while ((match = pattern.exec(agentsContent)) !== null) {
    headings.push({ raw: match[1]!.trim(), index: match.index + match[0].length });
  }

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i]!;
    const nextHeading = headings[i + 1];
    const sectionEnd = nextHeading
      ? agentsContent.lastIndexOf('\n', nextHeading.index - heading.raw.length - 5)
      : agentsContent.length;
    const section = agentsContent.slice(heading.index, sectionEnd);

    // Parse emoji and name from heading (e.g., "🏗️ System Architect")
    const emojiMatch = heading.raw.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*(.+)$/u);
    const emoji = emojiMatch?.[1] ?? '';
    const name = emojiMatch?.[2]?.trim() ?? heading.raw;

    // Extract fields
    const purpose =
      extractField(section, 'Purpose') ??
      extractField(section, 'Capability') ??
      '';
    const skills = extractField(section, 'Skills') ?? '';
    const activation =
      extractField(section, 'Activation') ??
      extractField(section, 'Triggers') ??
      '';

    agents.push({ name, emoji, purpose, skills, activation });
  }

  return agents;
}

function extractField(text: string, field: string): string | null {
  const pattern = new RegExp(
    `\\*\\*${field}:?\\*\\*[:\\s]*(.+?)(?:\\n|$)`,
    'i',
  );
  const match = pattern.exec(text);
  return match?.[1]?.trim() ?? null;
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const knowledgeModule: AiddModule = {
  name: 'knowledge',
  description: 'Technology Knowledge Base (TKB) queries, agent skills, and competency matrix',

  register(server: McpServer, context: ModuleContext) {
    // -----------------------------------------------------------------------
    // Resource: aidd://knowledge/{name}
    // -----------------------------------------------------------------------
    server.registerResource(
      'knowledge',
      new ResourceTemplate('aidd://knowledge/{name}', {
        list: async () => {
          const entries = buildTkbIndex(context.contentLoader);
          return {
            resources: entries.map((e) => ({
              uri: `aidd://knowledge/${encodeURIComponent(e.name)}`,
              name: e.name,
              description: `${e.category} | ${e.maturity}`,
              mimeType: 'text/markdown',
            })),
          };
        },
      }),
      { description: 'Technology Knowledge Base entries', mimeType: 'text/markdown' },
      async (uri, variables) => {
        const name = decodeURIComponent(String(variables.name));
        const entry = findTkbEntry(context.contentLoader, name);
        if (!entry) {
          return { contents: [{ uri: uri.href, text: `TKB entry "${name}" not found.`, mimeType: 'text/plain' }] };
        }
        const content = context.contentLoader.getContent(entry.path) ?? '';
        return { contents: [{ uri: uri.href, text: content, mimeType: 'text/markdown' }] };
      },
    );

    // -----------------------------------------------------------------------
    // Resource: aidd://skills/{name}
    // -----------------------------------------------------------------------
    server.registerResource(
      'skills',
      new ResourceTemplate('aidd://skills/{name}', {
        list: async () => {
          const skills = context.contentLoader.getIndex().skills;
          return {
            resources: skills.map((s) => {
              const name = s.frontmatter['name'] ?? s.name.replace('.md', '');
              return {
                uri: `aidd://skills/${encodeURIComponent(name)}`,
                name,
                description: s.frontmatter['description'] ?? '',
                mimeType: 'text/markdown',
              };
            }),
          };
        },
      }),
      { description: 'Agent skill definitions (SKILL.md files)', mimeType: 'text/markdown' },
      async (uri, variables) => {
        const skillName = decodeURIComponent(String(variables.name));
        const lower = skillName.toLowerCase();
        const skills = context.contentLoader.getIndex().skills;
        const found = skills.find((s) => {
          const n = s.frontmatter['name'] ?? s.name.replace('.md', '');
          return n.toLowerCase() === lower || n.toLowerCase().includes(lower);
        });
        if (!found) {
          return { contents: [{ uri: uri.href, text: `Skill "${skillName}" not found.`, mimeType: 'text/plain' }] };
        }
        return { contents: [{ uri: uri.href, text: found.getContent(), mimeType: 'text/markdown' }] };
      },
    );

    // -----------------------------------------------------------------------
    // aidd_query_tkb
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_query_tkb',
      description:
        'Search and filter the Technology Knowledge Base (TKB). Filter by category, maturity, or keyword. Returns compact results.',
      schema: {
        category: z
          .string()
          .optional()
          .describe(
            'Filter by category: runtime, frontend, backend, data, testing, infrastructure, security, tooling, pattern',
          ),
        maturity: z
          .string()
          .optional()
          .describe('Filter by maturity: stable, emerging, experimental, deprecated'),
        keyword: z
          .string()
          .optional()
          .describe('Search keyword (matches name and content)'),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe('Maximum number of results'),
      },
      annotations: { readOnlyHint: true },
      handler: async (args) => {
        const { category, maturity, keyword, limit } = args as {
          category?: string;
          maturity?: string;
          keyword?: string;
          limit: number;
        };

        let results = buildTkbIndex(context.contentLoader);

        if (category) {
          const lower = category.toLowerCase();
          results = results.filter((e) => e.category.toLowerCase() === lower);
        }

        if (maturity) {
          const lower = maturity.toLowerCase();
          results = results.filter((e) => e.maturity.toLowerCase() === lower);
        }

        if (keyword) {
          const lower = keyword.toLowerCase();
          results = results.filter((e) => {
            if (e.name.toLowerCase().includes(lower)) return true;
            if (e.summary.toLowerCase().includes(lower)) return true;
            const content = context.contentLoader.getContent(e.path);
            return content?.toLowerCase().includes(lower) ?? false;
          });
        }

        const limited = results.slice(0, limit);
        return createJsonResult({
          total: results.length,
          returned: limited.length,
          entries: limited.map((e) => ({
            name: e.name,
            category: e.category,
            maturity: e.maturity,
            lastUpdated: e.lastUpdated,
            summary: e.summary,
          })),
        });
      },
    });

    // -----------------------------------------------------------------------
    // aidd_get_tkb_entry
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_get_tkb_entry',
      description:
        'Get the full content of a specific Technology Knowledge Base entry by name.',
      schema: {
        name: z
          .string()
          .describe('TKB entry name (e.g., "astro", "nextjs", "prisma", "domain-driven-design")'),
      },
      annotations: { readOnlyHint: true },
      handler: async (args) => {
        const { name } = args as { name: string };
        const entry = findTkbEntry(context.contentLoader, name);

        if (!entry) {
          const suggestions = suggestSimilar(context.contentLoader, name);
          const hint =
            suggestions.length > 0
              ? `\nDid you mean: ${suggestions.join(', ')}?`
              : '\nUse aidd_query_tkb to search available entries.';
          return createErrorResult(`TKB entry "${name}" not found.${hint}`);
        }

        const content = context.contentLoader.getContent(entry.path);
        if (!content) {
          return createErrorResult(`Failed to read TKB entry at ${entry.path}`);
        }

        return createTextResult(
          `# ${entry.name}\n\n**Category**: ${entry.category} | **Maturity**: ${entry.maturity} | **Updated**: ${entry.lastUpdated}\n\n---\n\n${content}`,
        );
      },
    });

    // -----------------------------------------------------------------------
    // aidd_get_agent
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_get_agent',
      description:
        'Get an agent\'s SKILL.md file with parsed frontmatter. Provides the agent\'s capabilities, triggers, and implementation patterns.',
      schema: {
        agent: z
          .string()
          .describe(
            'Agent/skill name (e.g., "system-architect", "interface-artisan", "quality-engineer")',
          ),
      },
      annotations: { readOnlyHint: true },
      handler: async (args) => {
        const { agent } = args as { agent: string };
        const lower = agent.toLowerCase();
        const skills = context.contentLoader.getIndex().skills;

        const found = skills.find((s) => {
          const skillName = s.frontmatter['name'] ?? s.name.replace('.md', '');
          return skillName.toLowerCase() === lower || skillName.toLowerCase().includes(lower);
        });

        if (!found) {
          const available = skills
            .map((s) => s.frontmatter['name'] ?? s.name.replace('.md', ''))
            .join(', ');
          return createErrorResult(
            `Agent "${agent}" not found.\nAvailable: ${available}`,
          );
        }

        const content = found.getContent();
        return createTextResult(content);
      },
    });

    // -----------------------------------------------------------------------
    // aidd_get_competency_matrix
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_get_competency_matrix',
      description:
        'Get the cross-agent competency matrix showing all agents, their purposes, and activation triggers.',
      schema: {},
      annotations: { readOnlyHint: true },
      handler: async () => {
        const agentsEntry = context.contentLoader.getIndex().agents;
        if (!agentsEntry) {
          return createErrorResult(
            'AGENTS.md not found. Use aidd_scaffold to initialize AIDD in this project.',
          );
        }

        const agentsContent = agentsEntry.getContent();
        const agents = parseAgents(agentsContent);

        if (agents.length === 0) {
          return createTextResult(
            'No agent definitions found in AGENTS.md. Expected format: ### [emoji] AgentName',
          );
        }

        const lines: string[] = [
          '# Agent Competency Matrix\n',
          '| Agent | Purpose | Activation |',
          '|-------|---------|------------|',
        ];

        for (const agent of agents) {
          const emoji = agent.emoji ? `${agent.emoji} ` : '';
          const purpose = agent.purpose.slice(0, 80) + (agent.purpose.length > 80 ? '...' : '');
          lines.push(`| ${emoji}${agent.name} | ${purpose} | ${agent.activation} |`);
        }

        const skills = context.contentLoader.getIndex().skills;
        if (skills.length > 0) {
          lines.push('\n## Available Skills\n');
          for (const skill of skills) {
            const name = skill.frontmatter['name'] ?? skill.name;
            const desc = skill.frontmatter['description'] ?? '';
            const shortDesc = desc.split('\n')[0]?.slice(0, 100) ?? '';
            lines.push(`- **${name}**: ${shortDesc}`);
          }
        }

        return createTextResult(lines.join('\n'));
      },
    });
  },
};
