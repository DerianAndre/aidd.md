import { existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  writeFileSafe,
  ensureDir,
  writeJsonFile,
  readJsonFile,
  aiddPaths,
  DEFAULT_CONFIG,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ModuleContext, ContentPaths } from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// ---------------------------------------------------------------------------
// Template content
// ---------------------------------------------------------------------------

const AGENTS_MD_REDIRECT = `# AGENTS.md

> Cross-tool AI instructions for aidd.md projects.

## Startup Protocol

**At the start of every conversation, do one of the following:**

1. **MCP available** — Call the \`aidd_start\` MCP tool.
2. **MCP unavailable** — Run \`pnpm mcp:check\` in the terminal.

## Agent Definitions

See [.aidd/content/routing.md](.aidd/content/routing.md) for the full agent hierarchy and task dispatch.
`;

const AGENTS_MD = `# AIDD — AI-Driven Development

> The open standard for AI-Driven Development. Multi-IDE, AI-agnostic agent coordination.

**Last Updated**: ${new Date().toISOString().split('T')[0]}
**Version**: 1.0.0

---

## Agent System: Hierarchy and Roles

### Master Orchestrator

**Purpose:** Entry point for all requests. Decomposes intent, maps execution paths.
**Skills:** \`content/skills/orchestrator/\`
**Activation:** All requests (first responder)

### System Architect

**Purpose:** System design, architecture analysis, technical debt assessment
**Skills:** \`content/skills/system-architect/\`
**Activation:** /audit, /review, architecture tasks

### Quality Engineer

**Purpose:** Test generation, coverage analysis, edge cases
**Skills:** \`content/skills/quality-engineer/\`
**Activation:** /test, /analyze, testing tasks

---

## Golden Rules

1. Evidence-First: Logic/data/principles, never opinions
2. Zero Trust: Verify all claims against raw data
3. First Principles: Deconstruct to fundamentals
`;

const GLOBAL_RULES = `# Global Rules

> Rules that apply to every agent in every context.

---

## Core Principles

1. **Evidence-First**: Never opinions, always logic/data/principles
2. **Zero Trust**: Never accept premises as absolute truths
3. **First Principles**: Deconstruct to fundamental laws
4. **Pareto (80/20)**: Identify the 20% generating 80% impact
5. **Occam's Razor**: Simplest complete solution wins

## Code Standards

- ES modules only (\`import\`/\`export\`), never \`require\`
- TypeScript strict mode, no \`any\` without documented exception
- One responsibility per file
- Immutable patterns: operations return new instances

## Communication

- BLUF (Bottom Line Up Front) format
- Absolute terminological precision
- Cite sources for all claims
`;

// ---------------------------------------------------------------------------
// Preset definitions
// ---------------------------------------------------------------------------

interface FileToCreate {
  /** Absolute path to the file */
  fullPath: string;
  /** Relative display path (for output) */
  displayPath: string;
  content: string;
}

/** Read config overrides from .aidd/config.json if it exists. */
function readConfigOverrides(root: string): ContentPaths | undefined {
  const configPath = resolve(root, '.aidd', 'config.json');
  const config = readJsonFile<Record<string, unknown>>(configPath);
  if (!config) return undefined;
  const content = config['content'] as Record<string, unknown> | undefined;
  return content?.['paths'] as ContentPaths | undefined;
}

/** Resolve content directories, respecting config overrides. */
function resolveContentDirs(root: string): ReturnType<typeof aiddPaths> {
  const aiddRoot = resolve(root, '.aidd');
  const overrides = readConfigOverrides(root);
  return aiddPaths(aiddRoot, overrides);
}

function getMinimalFiles(root: string): FileToCreate[] {
  const dirs = resolveContentDirs(root);
  return [
    { fullPath: resolve(root, 'AGENTS.md'), displayPath: 'AGENTS.md', content: AGENTS_MD_REDIRECT },
    { fullPath: resolve(dirs.agents, 'routing.md'), displayPath: relative(root, resolve(dirs.agents, 'routing.md')), content: AGENTS_MD },  // dirs.agents points to content root
    { fullPath: resolve(dirs.rules, 'global.md'), displayPath: relative(root, resolve(dirs.rules, 'global.md')), content: GLOBAL_RULES },
  ];
}

function getStandardFiles(root: string): FileToCreate[] {
  const dirs = resolveContentDirs(root);
  return [
    ...getMinimalFiles(root),
    {
      fullPath: resolve(dirs.skills, 'README.md'),
      displayPath: relative(root, resolve(dirs.skills, 'README.md')),
      content: '# Skills\n\nAgent-specific skill definitions. Each agent has a `SKILL.md`.\n',
    },
    {
      fullPath: resolve(dirs.workflows, 'README.md'),
      displayPath: relative(root, resolve(dirs.workflows, 'README.md')),
      content: '# Workflows\n\nStep-by-step guides for multi-agent coordination.\n',
    },
    {
      fullPath: resolve(dirs.templates, 'README.md'),
      displayPath: relative(root, resolve(dirs.templates, 'README.md')),
      content: '# Templates\n\nTask routing templates and decision frameworks.\n',
    },
  ];
}

function getFullFiles(root: string): FileToCreate[] {
  const dirs = resolveContentDirs(root);
  return [
    ...getStandardFiles(root),
    {
      fullPath: resolve(dirs.specs, 'README.md'),
      displayPath: relative(root, resolve(dirs.specs, 'README.md')),
      content: '# Specifications\n\nAIDD standard specifications: lifecycle, heuristics, memory.\n',
    },
    {
      fullPath: resolve(dirs.knowledge, 'README.md'),
      displayPath: relative(root, resolve(dirs.knowledge, 'README.md')),
      content: '# Technology Knowledge Base (TKB)\n\nStructured technology entries for AI-driven decisions.\n',
    },
    {
      fullPath: resolve(root, '.aidd', 'memory', 'README.md'),
      displayPath: '.aidd/memory/README.md',
      content: '# Memory\n\nPersistent memory: decisions, mistakes, conventions.\n',
    },
  ];
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const scaffoldModule: AiddModule = {
  name: 'scaffold',
  description: 'Initialize AIDD framework in a project',

  register(server: McpServer, context: ModuleContext) {
    registerTool(server, {
      name: 'aidd_scaffold',
      description:
        'Initialize the AIDD framework in a project. Creates .aidd/ directory with agents, rules, skills, and other framework files based on the chosen preset.',
      schema: {
        path: z
          .string()
          .optional()
          .describe('Target project path. Defaults to current project root.'),
        preset: z
          .enum(['minimal', 'standard', 'full'])
          .optional()
          .default('standard')
          .describe(
            'Initialization preset: minimal (agents + rules), standard (+ skills, workflows, templates), full (+ specs, knowledge, memory, state)',
          ),
      },
      annotations: { destructiveHint: true, idempotentHint: true },
      handler: async (args) => {
        const { path: targetPath, preset } = args as {
          path?: string;
          preset: string;
        };

        const root = targetPath ?? context.projectRoot;
        const created: string[] = [];
        const skipped: string[] = [];

        // Select files based on preset (paths resolved via config overrides)
        let files: FileToCreate[];
        switch (preset) {
          case 'minimal':
            files = getMinimalFiles(root);
            break;
          case 'full':
            files = getFullFiles(root);
            break;
          default:
            files = getStandardFiles(root);
        }

        // Create files
        for (const file of files) {
          if (existsSync(file.fullPath)) {
            skipped.push(file.displayPath);
          } else {
            writeFileSafe(file.fullPath, file.content);
            created.push(file.displayPath);
          }
        }

        // For full preset, also create .aidd/ structure
        if (preset === 'full') {
          const aiddDir = resolve(root, '.aidd');
          const dirs = [
            'memory',
            'sessions/active',
            'sessions/completed',
            'branches',
            'branches/archive',
            'drafts',
            'analytics',
            'evolution',
            'evolution/snapshots',
            'cache',
          ];

          for (const dir of dirs) {
            const dirPath = resolve(aiddDir, dir);
            if (!existsSync(dirPath)) {
              ensureDir(dirPath);
              created.push(`.aidd/${dir}/`);
            }
          }

          // Create config.json
          const configPath = resolve(aiddDir, 'config.json');
          if (!existsSync(configPath)) {
            writeJsonFile(configPath, DEFAULT_CONFIG);
            created.push('.aidd/config.json');
          }

          // Create .gitignore for .aidd/
          const gitignorePath = resolve(aiddDir, '.gitignore');
          if (!existsSync(gitignorePath)) {
            writeFileSafe(
              gitignorePath,
              '# AIDD state directory — gitignored\ndata.db\ndata.db-wal\ndata.db-shm\nsessions/\ncache/\nanalytics/\n',
            );
            created.push('.aidd/.gitignore');
          }
        }

        return createJsonResult({
          preset,
          root,
          created,
          skipped,
          message: `AIDD initialized with '${preset}' preset (${created.length} files created, ${skipped.length} skipped)`,
        });
      },
    });
  },
};
