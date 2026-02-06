import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerTool,
  createTextResult,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ModuleContext } from '@aidd.md/mcp-shared';

// ---------------------------------------------------------------------------
// Commit message generation
// ---------------------------------------------------------------------------

interface DiffAnalysis {
  type: string;
  scope: string;
  files: string[];
  summary: string;
}

function analyzeDiff(diff: string): DiffAnalysis {
  const files: string[] = [];
  const diffLines = diff.split('\n');

  // Extract file paths from diff headers
  for (const line of diffLines) {
    const fileMatch = line.match(/^(?:diff --git a\/|[+]{3} b\/)(.+)/);
    if (fileMatch) {
      const filePath = fileMatch[1]!.trim();
      if (!files.includes(filePath)) files.push(filePath);
    }
  }

  // Infer type from file patterns
  let type = 'chore';
  const hasTests = files.some((f) => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f) || f.includes('__tests__'));
  const hasDocs = files.some((f) => /\.(md|mdx)$/.test(f) || f.startsWith('docs/'));
  const hasSrc = files.some((f) => f.startsWith('src/') || f.startsWith('lib/') || f.startsWith('app/'));
  const hasConfig = files.some((f) => /\.(json|yaml|yml|toml)$/.test(f) || f.includes('config'));

  // Count additions/deletions
  const additions = diffLines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
  const deletions = diffLines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length;

  if (hasTests && !hasSrc) {
    type = 'test';
  } else if (hasDocs && !hasSrc) {
    type = 'docs';
  } else if (additions > deletions * 3) {
    type = 'feat';
  } else if (deletions > additions * 2) {
    type = 'refactor';
  } else if (hasSrc && additions > 0) {
    // Could be fix or feat — check diff content
    const hasFixKeywords = diff.match(/\b(fix|bug|issue|error|crash|patch|resolve)\b/gi);
    type = hasFixKeywords ? 'fix' : 'feat';
  } else if (hasConfig) {
    type = 'chore';
  }

  // Extract scope from common path prefix
  let scope = '';
  if (files.length > 0) {
    const parts = files[0]!.split('/');
    if (parts.length > 1) {
      // Use first meaningful directory
      scope = parts[0] === 'src' && parts.length > 2 ? parts[1]! : parts[0]!;
    }
  }

  // Generate summary
  const fileCount = files.length;
  const summary = `${additions} addition(s), ${deletions} deletion(s) across ${fileCount} file(s)`;

  return { type, scope, files, summary };
}

// ---------------------------------------------------------------------------
// Migration planning
// ---------------------------------------------------------------------------

interface MigrationStep {
  order: number;
  action: string;
  risk: 'low' | 'medium' | 'high';
}

function planMigrationSteps(framework: string, currentVersion: string, targetVersion?: string): MigrationStep[] {
  const steps: MigrationStep[] = [];
  let order = 1;

  // Generic migration steps
  steps.push({ order: order++, action: `Backup: Create a new branch for the ${framework} upgrade`, risk: 'low' });
  steps.push({ order: order++, action: `Audit: Review ${framework} changelog from v${currentVersion} to ${targetVersion ?? 'latest'}`, risk: 'low' });
  steps.push({ order: order++, action: `Deps: Update ${framework} in package.json to target version`, risk: 'medium' });
  steps.push({ order: order++, action: 'Install: Run pnpm install and resolve peer dependency conflicts', risk: 'medium' });
  steps.push({ order: order++, action: 'Typecheck: Run tsc --noEmit and fix type errors from breaking changes', risk: 'medium' });
  steps.push({ order: order++, action: 'Test: Run test suite and fix failing tests', risk: 'medium' });
  steps.push({ order: order++, action: 'Build: Run production build and verify no build errors', risk: 'medium' });
  steps.push({ order: order++, action: 'Smoke test: Manual verification of critical paths', risk: 'high' });

  // Framework-specific guardrails
  const fw = framework.toLowerCase();
  if (fw.includes('react') && currentVersion.startsWith('18')) {
    steps.splice(4, 0, { order: 0, action: 'React 19: Replace forwardRef with ref prop, update ReactDOM.render to createRoot', risk: 'high' });
  }
  if (fw.includes('tailwind') && currentVersion.startsWith('3')) {
    steps.splice(4, 0, { order: 0, action: 'Tailwind 4: Migrate tailwind.config.js to CSS @theme, remove content array', risk: 'high' });
  }
  if (fw.includes('astro') && currentVersion.startsWith('4')) {
    steps.splice(4, 0, { order: 0, action: 'Astro 5: Migrate collections to use loader API, replace ViewTransitions with ClientRouter', risk: 'high' });
  }

  // Re-number
  return steps.map((s, i) => ({ ...s, order: i + 1 }));
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const executionModule: AiddModule = {
  name: 'execution',
  description: 'Code generation and migration planning tools',

  register(server: McpServer, _context: ModuleContext) {

    // -----------------------------------------------------------------------
    // 1. aidd_generate_commit_message
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_generate_commit_message',
      description: 'Analyze a git diff and generate a conventional commit message. Infers type (feat/fix/refactor/test/docs/chore) and scope from file patterns.',
      schema: {
        diff: z.string().describe('Git diff output (from git diff or git diff --staged)'),
        context: z.string().optional().describe('Optional context about what was changed (ticket number, feature name)'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const { diff, context: ctxHint } = args as { diff: string; context?: string };
        const analysis = analyzeDiff(diff);
        const scope = analysis.scope ? `(${analysis.scope})` : '';
        const contextHint = ctxHint ? ` — ${ctxHint}` : '';

        const lines: string[] = [];
        lines.push('Suggested commit message:\n');
        lines.push(`  ${analysis.type}${scope}: <describe the change>${contextHint}\n`);
        lines.push(`Analysis:`);
        lines.push(`  Type: ${analysis.type}`);
        lines.push(`  Scope: ${analysis.scope || '(none detected)'}`);
        lines.push(`  Stats: ${analysis.summary}`);

        if (analysis.files.length > 0) {
          lines.push(`  Files (${analysis.files.length}):`);
          for (const f of analysis.files.slice(0, 15)) {
            lines.push(`    - ${f}`);
          }
          if (analysis.files.length > 15) {
            lines.push(`    ... and ${analysis.files.length - 15} more`);
          }
        }

        return createTextResult(lines.join('\n'));
      },
    });

    // -----------------------------------------------------------------------
    // 2. aidd_plan_migration
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_plan_migration',
      description: 'Generate a framework upgrade migration plan with step-by-step checklist and risk assessment.',
      schema: {
        framework: z.string().describe('Framework to upgrade (e.g., "react", "tailwindcss", "astro")'),
        currentVersion: z.string().describe('Current version (e.g., "18.2.0")'),
        targetVersion: z.string().optional().describe('Target version (e.g., "19.0.0"). Defaults to latest.'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const { framework, currentVersion, targetVersion } = args as { framework: string; currentVersion: string; targetVersion?: string };
        const steps = planMigrationSteps(framework, currentVersion, targetVersion);
        const target = targetVersion ?? 'latest';

        const lines: string[] = [];
        lines.push(`Migration Plan: ${framework} v${currentVersion} -> v${target}\n`);

        for (const step of steps) {
          const riskIcon = step.risk === 'high' ? '[HIGH]' : step.risk === 'medium' ? '[MED]' : '[LOW]';
          lines.push(`  ${step.order}. ${riskIcon} ${step.action}`);
        }

        lines.push('');
        lines.push('Guardrails:');
        lines.push('  - Run version verification after upgrade: aidd_verify_version');
        lines.push('  - Check compliance against rules: aidd_check_compliance');
        lines.push('  - Validate quality gates before merging: aidd_check_quality_gates');

        return createTextResult(lines.join('\n'));
      },
    });
  },
};
