import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerTool,
  createTextResult,
  readJsonFile,
  deepMerge,
  DEFAULT_CONFIG,
} from '@aidd.md/mcp-shared';
import type { AiddConfig, AiddModule, ModuleContext } from '@aidd.md/mcp-shared';

// ---------------------------------------------------------------------------
// S2D checksum reader
// ---------------------------------------------------------------------------

interface DocsChecksum {
  status: 'FOUND' | 'NOT_FOUND' | 'INVALID';
  checksum?: string;
  lastMutation?: string;
  docsPath?: string;
}

function readDocsChecksum(projectRoot: string): DocsChecksum {
  const docsPath = resolve(projectRoot, 'docs', 'ai', 'index.md');
  try {
    const content = readFileSync(docsPath, 'utf-8');
    const checksumMatch = content.match(/archChecksum:\s*([a-f0-9]+)/);
    const mutationMatch = content.match(/lastMutation:\s*(\S+)/);
    if (!checksumMatch) return { status: 'INVALID', docsPath };
    return {
      status: 'FOUND',
      checksum: checksumMatch[1],
      lastMutation: mutationMatch?.[1],
      docsPath,
    };
  } catch {
    return { status: 'NOT_FOUND' };
  }
}

function getLiveCiConfig(context: ModuleContext): AiddConfig['ci'] {
  const configPath = resolve(context.aiddDir, 'config.json');
  const raw = readJsonFile<Partial<AiddConfig>>(configPath);
  const merged = raw ? deepMerge(DEFAULT_CONFIG, raw) : context.config;
  return merged.ci;
}
import type { ValidationResult, ValidationIssue } from '../validation/types.js';
import { resolveContent } from '../validation/utils.js';

// Import validators for per-file dispatch
import { scanSecrets } from '../validation/validators/scan-secrets.js';
import { validateTests } from '../validation/validators/validate-tests.js';
import { validateSql } from '../validation/validators/validate-sql.js';
import { validateDockerfile } from '../validation/validators/validate-dockerfile.js';
import { validateI18n } from '../validation/validators/validate-i18n.js';
import { auditAccessibility } from '../validation/validators/audit-accessibility.js';
import { auditPerformance } from '../validation/validators/audit-performance.js';
import { validateDesignTokens } from '../validation/validators/validate-design-tokens.js';

// ---------------------------------------------------------------------------
// File-type → validator mapping
// ---------------------------------------------------------------------------

interface ValidatorMapping {
  filePattern: RegExp;
  validator: (content: string, filePath?: string) => ValidationResult;
  label: string;
}

const FILE_VALIDATORS: ValidatorMapping[] = [
  { filePattern: /\.(test|spec)\.(ts|tsx|js|jsx)$/, validator: validateTests, label: 'test-structure' },
  { filePattern: /\.sql$/, validator: validateSql, label: 'sql-syntax' },
  { filePattern: /Dockerfile/, validator: validateDockerfile, label: 'dockerfile' },
  { filePattern: /\.json$/i, validator: validateI18n, label: 'i18n' },
  { filePattern: /\.(tsx|jsx|html|vue|svelte)$/, validator: auditAccessibility, label: 'accessibility' },
  { filePattern: /\.(ts|tsx|js|jsx)$/, validator: auditPerformance, label: 'performance' },
  { filePattern: /\.(css|json)$/, validator: validateDesignTokens, label: 'design-tokens' },
];

// Secrets scanner runs on all files
const ALWAYS_RUN = [{ validator: scanSecrets, label: 'secrets' }];

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const ciModule: AiddModule = {
  name: 'ci',
  description: 'CI/CD compliance reporting and diff-based validation tools',

  register(server: McpServer, context: ModuleContext) {

    // -----------------------------------------------------------------------
    // 1. aidd_ci_report
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_ci_report',
      description: 'Generate a CI/CD compliance report. Aggregates rule checks and validator results. Respects config.ci blockOn/warnOn/ignore settings.',
      schema: {
        format: z.enum(['markdown', 'json']).optional().describe('Output format. Defaults to markdown.'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const { format: fmt } = args as { format?: 'markdown' | 'json' };
        const ci = getLiveCiConfig(context);
        const format = fmt ?? 'markdown';

        const docsChecksum = readDocsChecksum(context.projectRoot);
        const report = {
          blockOn: ci.blockOn,
          warnOn: ci.warnOn,
          ignore: ci.ignore,
          validators: 11,
          enforcementTools: 4,
          executionTools: 2,
          ciTools: 2,
          totalTools: 19,
          phases: ['sync', 'story', 'plan', 'commit_spec', 'execute', 'test', 'verify', 'commit_impl'],
          qualityGates: 10,
          docsChecksum,
        };

        if (format === 'json') {
          return createTextResult(JSON.stringify(report, null, 2));
        }

        const lines: string[] = [];
        lines.push('# CI/CD Compliance Report\n');
        lines.push('## Configuration');
        lines.push(`  Block on: ${ci.blockOn.join(', ') || '(none)'}`);
        lines.push(`  Warn on: ${ci.warnOn.join(', ') || '(none)'}`);
        lines.push(`  Ignore: ${ci.ignore.join(', ') || '(none)'}`);
        lines.push('');
        lines.push('## Documentation Checksum');
        lines.push(`  Status: ${docsChecksum.status}`);
        if (docsChecksum.docsPath) lines.push(`  Path: ${docsChecksum.docsPath}`);
        if (docsChecksum.checksum) lines.push(`  Checksum: ${docsChecksum.checksum}`);
        if (docsChecksum.lastMutation) lines.push(`  Last mutation: ${docsChecksum.lastMutation}`);
        if (docsChecksum.status !== 'FOUND') lines.push(`  Verify: pnpm mcp:docs --check`);
        lines.push('');
        lines.push('## Available Validators');
        lines.push(`  Validation tools: ${report.validators}`);
        lines.push(`  Enforcement tools: ${report.enforcementTools}`);
        lines.push(`  Execution tools: ${report.executionTools}`);
        lines.push(`  CI tools: ${report.ciTools}`);
        lines.push(`  Total: ${report.totalTools} tools`);
        lines.push('');
        lines.push('## AIDD Lifecycle');
        lines.push(`  Phases: ${report.phases.join(' -> ')}`);
        lines.push(`  Quality gates: ${report.qualityGates}`);
        lines.push('');
        lines.push('## Usage');
        lines.push('  1. Run validators on changed files: aidd_ci_diff_check');
        lines.push('  2. Check compliance against rules: aidd_check_compliance');
        lines.push('  3. Verify framework versions: aidd_verify_version');
        lines.push('  4. Validate quality gates: aidd_check_quality_gates');

        return createTextResult(lines.join('\n'));
      },
    });

    // -----------------------------------------------------------------------
    // 2. aidd_ci_diff_check
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_ci_diff_check',
      description: 'Check only changed files by dispatching appropriate validators based on file type. Runs secrets scanner on all files.',
      schema: {
        changedFiles: z.array(z.string()).describe('List of changed file paths to validate'),
        format: z.enum(['markdown', 'json']).optional().describe('Output format. Defaults to markdown.'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const { changedFiles, format: fmt } = args as { changedFiles: string[]; format?: 'markdown' | 'json' };
        const format = fmt ?? 'markdown';
        const results: Array<{ file: string; validator: string; result: ValidationResult }> = [];

        for (const filePath of changedFiles) {
          // Read file content
          const content = await resolveContent({ filePath });
          if (!content) continue;

          // Always run secrets scanner
          for (const always of ALWAYS_RUN) {
            const result = always.validator(content, filePath);
            if (result.issues.length > 0) {
              results.push({ file: filePath, validator: always.label, result });
            }
          }

          // Run file-type-specific validators
          for (const mapping of FILE_VALIDATORS) {
            if (mapping.filePattern.test(filePath)) {
              const result = mapping.validator(content, filePath);
              if (result.issues.length > 0) {
                results.push({ file: filePath, validator: mapping.label, result });
              }
            }
          }
        }

        // Aggregate
        const totalIssues = results.reduce((sum, r) => sum + r.result.issues.length, 0);
        const allIssues: Array<{ file: string; validator: string; issue: ValidationIssue }> = [];
        for (const r of results) {
          for (const issue of r.result.issues) {
            allIssues.push({ file: r.file, validator: r.validator, issue });
          }
        }

        if (format === 'json') {
          return createTextResult(JSON.stringify({
            filesChecked: changedFiles.length,
            totalIssues,
            issues: allIssues.map((i) => ({
              file: i.file,
              validator: i.validator,
              severity: i.issue.severity,
              message: i.issue.message,
              line: i.issue.line,
            })),
          }, null, 2));
        }

        // Markdown format
        const lines: string[] = [];
        lines.push(`# Diff Check Report\n`);
        lines.push(`Files checked: ${changedFiles.length}`);
        lines.push(`Total issues: ${totalIssues}\n`);

        if (totalIssues === 0) {
          lines.push('All changed files passed validation.');
        } else {
          // Group by file
          const byFile = new Map<string, typeof allIssues>();
          for (const entry of allIssues) {
            const list = byFile.get(entry.file) ?? [];
            list.push(entry);
            byFile.set(entry.file, list);
          }

          for (const [file, fileIssues] of byFile) {
            lines.push(`## ${file}`);
            for (const entry of fileIssues) {
              const prefix = entry.issue.severity === 'error' ? '[ERROR]' : entry.issue.severity === 'warning' ? '[WARN]' : '[INFO]';
              const loc = entry.issue.line ? ` (line ${entry.issue.line})` : '';
              lines.push(`  ${prefix} [${entry.validator}]${loc}: ${entry.issue.message}`);
            }
            lines.push('');
          }
        }

        return createTextResult(lines.join('\n'));
      },
    });
  },
};
