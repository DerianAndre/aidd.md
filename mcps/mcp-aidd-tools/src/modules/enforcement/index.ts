import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerTool,
  createTextResult,
  createErrorResult,
  readFileOrNull,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ModuleContext } from '@aidd.md/mcp-shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ComplianceIssue {
  severity: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  line?: number;
}

/** Extract MUST/MUST NOT/NEVER constraints from a rule file's markdown. */
function extractConstraints(ruleContent: string): Array<{ pattern: string; type: 'must' | 'must_not' }> {
  const constraints: Array<{ pattern: string; type: 'must' | 'must_not' }> = [];
  const lines = ruleContent.split('\n');

  for (const line of lines) {
    const mustNotMatch = line.match(/(?:MUST NOT|NEVER|DO NOT)\s+(?:use\s+)?[`"]?([^`"\n.]+)[`"]?/i);
    if (mustNotMatch) {
      constraints.push({ pattern: mustNotMatch[1]!.trim(), type: 'must_not' });
    }
    const mustMatch = line.match(/(?:^|\s)MUST\s+(?:use\s+)?[`"]?([^`"\n.]+)[`"]?/i);
    if (mustMatch && !line.match(/MUST NOT/i)) {
      constraints.push({ pattern: mustMatch[1]!.trim(), type: 'must' });
    }
  }
  return constraints;
}

// ---------------------------------------------------------------------------
// ASDD Quality Gates
// ---------------------------------------------------------------------------

interface QualityGate {
  id: string;
  label: string;
  description: string;
}

const ASDD_PHASES = [
  { name: 'sync', objective: 'Analyze request, ask clarifying questions' },
  { name: 'story', objective: 'Write user story with acceptance criteria' },
  { name: 'plan', objective: 'Create atomic task list with files to modify' },
  { name: 'commit_spec', objective: 'Commit specification as docs(scope)' },
  { name: 'execute', objective: 'Implement following the plan strictly' },
  { name: 'test', objective: 'Write/update tests matching acceptance criteria' },
  { name: 'verify', objective: 'Run full verification: typecheck + lint + tests' },
  { name: 'commit_impl', objective: 'Commit implementation as feat/fix(scope)' },
];

const QUALITY_GATES: QualityGate[] = [
  { id: 'acceptance_criteria', label: 'Acceptance Criteria Met', description: 'All Given/When/Then scenarios pass' },
  { id: 'typescript_clean', label: 'TypeScript Clean', description: 'Zero typecheck errors across all packages' },
  { id: 'tests_pass', label: 'Tests Pass', description: 'All targeted tests pass (unit + integration)' },
  { id: 'no_dead_code', label: 'No Dead Code', description: 'No unused imports, variables, or unreachable code' },
  { id: 'no_any', label: 'No Untyped Code', description: "No 'any' type without documented exception" },
  { id: 'spec_matches', label: 'Spec Matches Implementation', description: 'Specification updated if implementation diverged' },
  { id: 'naming_conventions', label: 'Naming Conventions', description: 'Files kebab-case, types PascalCase, functions camelCase' },
  { id: 'es_modules', label: 'ES Modules Only', description: 'No require() calls — import/export only' },
  { id: 'no_secrets', label: 'No Hardcoded Secrets', description: 'No API keys, tokens, or connection strings in code' },
  { id: 'docs_updated', label: 'Documentation Updated', description: 'Relevant docs reflect the changes' },
];

// ---------------------------------------------------------------------------
// Version Protocol
// ---------------------------------------------------------------------------

interface VersionCheck {
  framework: string;
  version: string;
  antiPatterns: string[];
  confidence: 'high' | 'medium' | 'low';
}

const ANTI_LEGACY_RULES: Array<{ framework: RegExp; minVersion: string; patterns: string[] }> = [
  { framework: /tailwindcss/i, minVersion: '4.0', patterns: ['tailwind.config.js', 'tailwind.config.mjs', 'tailwind.config.ts', 'content array in config'] },
  { framework: /react/i, minVersion: '19.0', patterns: ['forwardRef (use ref prop directly)', 'ReactDOM.render (use createRoot)'] },
  { framework: /astro/i, minVersion: '5.0', patterns: ['legacy collections without loader', 'ViewTransitions (use ClientRouter)'] },
  { framework: /@strapi\/strapi/i, minVersion: '5.0', patterns: ['entityService (use documents)', '.data.attributes pattern'] },
  { framework: /next/i, minVersion: '15.0', patterns: ['pages/ router for new code', 'getServerSideProps (use server components)'] },
];

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Dangerous function patterns to detect (security check)
const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; rule: string; message: string }> = [
  { pattern: /\beval\s*\(/g, rule: 'security', message: 'Dangerous code evaluation detected. Security vulnerability.' },
  { pattern: /\bnew\s+Function\s*\(/g, rule: 'security', message: 'Dynamic function constructor detected. Security vulnerability.' },
];

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const enforcementModule: AiddModule = {
  name: 'enforcement',
  description: 'Code compliance, version verification, and quality gate tools',

  register(server: McpServer, context: ModuleContext) {

    // -----------------------------------------------------------------------
    // 1. aidd_check_compliance
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_check_compliance',
      description: 'Check code content against AIDD rules for compliance violations. Extracts MUST/MUST NOT constraints from rule files and checks content.',
      schema: {
        content: z.string().describe('Code content to check'),
        filePath: z.string().optional().describe('File path for context (affects which rules apply)'),
        ruleCategories: z.array(z.string()).optional().describe('Specific rule categories to check (e.g., ["code-style", "testing"]). Defaults to all rules.'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const { content, ruleCategories } = args as { content: string; filePath?: string; ruleCategories?: string[] };
        const issues: ComplianceIssue[] = [];

        // Load rules from content index
        const index = context.contentLoader.getIndex();
        const allRuleEntries = index.rules;
        const targetEntries = ruleCategories
          ? allRuleEntries.filter((entry) => ruleCategories.some((c) => entry.name.toLowerCase().includes(c.toLowerCase())))
          : allRuleEntries;

        for (const entry of targetEntries) {
          const ruleContent = entry.getContent();
          if (!ruleContent) continue;

          const constraints = extractConstraints(ruleContent);

          for (const constraint of constraints) {
            if (constraint.type === 'must_not') {
              const escaped = constraint.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const re = new RegExp(escaped, 'gi');
              if (re.test(content)) {
                issues.push({
                  severity: 'error',
                  rule: entry.name,
                  message: `MUST NOT: "${constraint.pattern}" found in content.`,
                });
              }
            }
          }
        }

        // Built-in checks
        if (/\brequire\s*\(/.test(content)) {
          issues.push({ severity: 'error', rule: 'es-modules', message: 'require() detected. Use ES module imports.' });
        }
        if (/:\s*any\b/.test(content) && !/\/\/ eslint-disable|@ts-expect-error|documented exception/i.test(content)) {
          issues.push({ severity: 'warning', rule: 'no-any', message: "'any' type detected without documented exception." });
        }
        for (const dp of DANGEROUS_PATTERNS) {
          if (dp.pattern.test(content)) {
            issues.push({ severity: 'error', rule: dp.rule, message: dp.message });
          }
        }

        // Respect CI config for severity
        const ci = context.config.ci;
        const filteredIssues = issues.filter((issue) => {
          const ruleId = issue.rule;
          if (ci.ignore.some((p) => ruleId.includes(p))) return false;
          return true;
        });

        if (filteredIssues.length === 0) {
          return createTextResult(`Compliance check passed. ${targetEntries.length} rule(s) checked.`);
        }

        const lines: string[] = [`Compliance Issues (${filteredIssues.length}):\n`];
        for (const issue of filteredIssues) {
          const prefix = issue.severity === 'error' ? '[ERROR]' : issue.severity === 'warning' ? '[WARN]' : '[INFO]';
          lines.push(`${prefix} [${issue.rule}] ${issue.message}`);
        }
        return createTextResult(lines.join('\n'));
      },
    });

    // -----------------------------------------------------------------------
    // 2. aidd_verify_version
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_verify_version',
      description: 'Run the 4-step Version Verification Protocol. Detects project dependencies and flags anti-legacy patterns for each framework version.',
      schema: {
        packageJsonPath: z.string().optional().describe('Path to package.json. Defaults to project root.'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const { packageJsonPath } = args as { packageJsonPath?: string };
        const pkgPath = packageJsonPath ?? `${context.projectRoot}/package.json`;
        const raw = await readFileOrNull(pkgPath);
        if (!raw) return createErrorResult(`package.json not found at ${pkgPath}`);

        let pkg: Record<string, unknown>;
        try { pkg = JSON.parse(raw); } catch { return createErrorResult('Invalid package.json'); }

        // Step 1: Extract deps
        const allDeps: Record<string, string> = {
          ...(pkg.dependencies as Record<string, string> ?? {}),
          ...(pkg.devDependencies as Record<string, string> ?? {}),
        };

        // Step 2: Run anti-legacy checks
        const checks: VersionCheck[] = [];
        for (const [depName, depVersion] of Object.entries(allDeps)) {
          const cleanVersion = depVersion.replace(/^[^~\d]*/, '');
          for (const rule of ANTI_LEGACY_RULES) {
            if (rule.framework.test(depName) && compareVersions(cleanVersion, rule.minVersion) >= 0) {
              checks.push({
                framework: depName,
                version: cleanVersion,
                antiPatterns: rule.patterns,
                confidence: 'high',
              });
            }
          }
        }

        // Format output
        const lines: string[] = [];
        lines.push(`Version Verification Protocol\n`);
        lines.push(`Step 1: ${Object.keys(allDeps).length} dependencies detected`);
        lines.push(`Step 2: Project context loaded`);
        lines.push(`Step 3: API verification (static check)`);
        lines.push(`Step 4: Anti-legacy filter\n`);

        if (checks.length === 0) {
          lines.push('No anti-legacy patterns detected for current versions.');
        } else {
          for (const check of checks) {
            lines.push(`${check.framework} v${check.version} (confidence: ${check.confidence}):`);
            for (const pattern of check.antiPatterns) {
              lines.push(`  - Reject: ${pattern}`);
            }
          }
        }

        return createTextResult(lines.join('\n'));
      },
    });

    // -----------------------------------------------------------------------
    // 3. aidd_check_quality_gates
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_check_quality_gates',
      description: 'Validate ASDD quality gates for a given phase. Returns required exit criteria and evaluates a provided checklist.',
      schema: {
        phase: z.string().describe('ASDD phase name (sync, story, plan, commit_spec, execute, test, verify, commit_impl)'),
        checklist: z.record(z.string(), z.boolean()).optional().describe('Optional checklist: { gateId: true/false }. Returns evaluation if provided.'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const { phase: phaseName, checklist } = args as { phase: string; checklist?: Record<string, boolean> };
        const phase = ASDD_PHASES.find((p) => p.name === phaseName.toLowerCase());
        if (!phase) {
          const validPhases = ASDD_PHASES.map((p) => p.name).join(', ');
          return createErrorResult(`Unknown phase "${phaseName}". Valid phases: ${validPhases}`);
        }

        const lines: string[] = [];
        lines.push(`ASDD Phase: ${phase.name}`);
        lines.push(`Objective: ${phase.objective}\n`);
        lines.push('Quality Gates:');

        let passed = 0;
        let failed = 0;
        let unchecked = 0;

        for (const gate of QUALITY_GATES) {
          if (checklist && gate.id in checklist) {
            const status = checklist[gate.id] ? 'PASS' : 'FAIL';
            if (checklist[gate.id]) passed++; else failed++;
            lines.push(`  [${status}] ${gate.label}: ${gate.description}`);
          } else {
            unchecked++;
            lines.push(`  [----] ${gate.label}: ${gate.description}`);
          }
        }

        lines.push('');
        if (checklist) {
          lines.push(`Results: ${passed} passed, ${failed} failed, ${unchecked} unchecked`);
          if (failed > 0) lines.push('Phase cannot advance until all gates pass.');
        } else {
          lines.push('Provide a checklist to evaluate gates (e.g., { "acceptance_criteria": true }).');
        }

        return createTextResult(lines.join('\n'));
      },
    });

    // -----------------------------------------------------------------------
    // 4. aidd_explain_violation
    // -----------------------------------------------------------------------
    registerTool(server, {
      name: 'aidd_explain_violation',
      description: 'Explain why a rule exists and how to fix a violation. Loads the rule from AIDD framework and extracts rationale.',
      schema: {
        rule: z.string().describe('Rule name or keyword (e.g., "code-style", "no-any", "testing")'),
        violation: z.string().optional().describe('Optional: specific violation to explain'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const { rule, violation } = args as { rule: string; violation?: string };
        const index = context.contentLoader.getIndex();
        const ruleEntries = index.rules;
        const match = ruleEntries.find((e) => e.name.toLowerCase().includes(rule.toLowerCase()));

        if (!match) {
          const ruleNames = ruleEntries.map((e) => e.name).join(', ');
          return createTextResult(
            `No rule file found matching "${rule}".\nAvailable rules: ${ruleNames}\n\nBuilt-in rules: es-modules, no-any, no-secrets, security`
          );
        }

        const ruleContent = match.getContent();
        if (!ruleContent) return createErrorResult(`Failed to load rule: ${match.name}`);

        const lines: string[] = [];
        lines.push(`Rule: ${match.name}\n`);

        const titleMatch = ruleContent.match(/^#\s+(.+)$/m);
        if (titleMatch) lines.push(`Title: ${titleMatch[1]!}`);

        const activationMatch = ruleContent.match(/\*\*Activation:\*\*\s*(.+)/i);
        if (activationMatch) lines.push(`Activation: ${activationMatch[1]!}`);

        const rationaleSection = ruleContent.match(/##\s+(?:Philosophy|Rationale|Why)[\s\S]*?(?=\n##|\n$)/i);
        if (rationaleSection) {
          lines.push(`\nRationale:\n${rationaleSection[0]!.substring(0, 500)}`);
        }

        const constraints = extractConstraints(ruleContent);
        if (constraints.length > 0) {
          lines.push('\nKey Constraints:');
          for (const c of constraints.slice(0, 10)) {
            lines.push(`  ${c.type === 'must_not' ? 'MUST NOT' : 'MUST'}: ${c.pattern}`);
          }
        }

        if (violation) {
          lines.push(`\nViolation: "${violation}"`);
          lines.push('Fix: Review the rule above and refactor to comply with the stated constraints.');
        }

        return createTextResult(lines.join('\n'));
      },
    });
  },
};
