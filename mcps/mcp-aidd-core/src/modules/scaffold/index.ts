import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  writeFileSafe,
  ensureDir,
  writeJsonFile,
  DEFAULT_CONFIG,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ModuleContext } from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// ---------------------------------------------------------------------------
// Template content
// ---------------------------------------------------------------------------

const AGENTS_MD = `# AIDD — AI-Driven Development

> The open standard for AI-Driven Development. Multi-IDE, AI-agnostic agent coordination.

**Last Updated**: ${new Date().toISOString().split('T')[0]}
**Version**: 1.0.0

---

## Agent System: Hierarchy and Roles

### Master Orchestrator

**Purpose:** Entry point for all requests. Decomposes intent, maps execution paths.
**Skills:** \`skills/orchestrator/\`
**Activation:** All requests (first responder)

### System Architect

**Purpose:** System design, architecture analysis, technical debt assessment
**Skills:** \`skills/system-architect/\`
**Activation:** /audit, /review, architecture tasks

### Quality Engineer

**Purpose:** Test generation, coverage analysis, edge cases
**Skills:** \`skills/quality-engineer/\`
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
  path: string;
  content: string;
}

function getMinimalFiles(): FileToCreate[] {
  return [
    { path: 'AGENTS.md', content: AGENTS_MD },
    { path: 'rules/global.md', content: GLOBAL_RULES },
  ];
}

function getStandardFiles(): FileToCreate[] {
  return [
    ...getMinimalFiles(),
    {
      path: 'skills/README.md',
      content: '# Skills\n\nAgent-specific skill definitions. Each agent has a `SKILL.md`.\n',
    },
    {
      path: 'workflows/README.md',
      content: '# Workflows\n\nStep-by-step guides for multi-agent coordination.\n',
    },
    {
      path: 'templates/README.md',
      content: '# Templates\n\nTask routing templates and decision frameworks.\n',
    },
  ];
}

function getFullFiles(): FileToCreate[] {
  return [
    ...getStandardFiles(),
    {
      path: 'spec/README.md',
      content: '# Specifications\n\nAIDD standard specifications: lifecycle, heuristics, memory.\n',
    },
    {
      path: 'knowledge/README.md',
      content: '# Technology Knowledge Base (TKB)\n\nStructured technology entries for AI-driven decisions.\n',
    },
    {
      path: 'memory/README.md',
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
        'Initialize the AIDD framework in a project. Creates AGENTS.md, rules, skills, and other framework files based on the chosen preset.',
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
            'Initialization preset: minimal (AGENTS.md + rules), standard (+ skills, workflows, templates), full (+ spec, knowledge, memory, .aidd/)',
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

        // Select files based on preset
        let files: FileToCreate[];
        switch (preset) {
          case 'minimal':
            files = getMinimalFiles();
            break;
          case 'full':
            files = getFullFiles();
            break;
          default:
            files = getStandardFiles();
        }

        // Create files
        for (const file of files) {
          const fullPath = resolve(root, file.path);
          if (existsSync(fullPath)) {
            skipped.push(file.path);
          } else {
            writeFileSafe(fullPath, file.content);
            created.push(file.path);
          }
        }

        // For full preset, also create .aidd/ structure
        if (preset === 'full') {
          const aiddDir = resolve(root, '.aidd');
          const dirs = [
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
