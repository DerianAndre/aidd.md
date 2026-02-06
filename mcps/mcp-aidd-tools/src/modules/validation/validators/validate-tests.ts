import type { ValidationResult, ValidationIssue } from '../types.js';

const ASSERTION_PATTERNS = [
  /expect\s*\(/, /assert\s*[\.(]/, /\.toEqual\s*\(/, /\.toBe\s*\(/,
  /\.toMatch\s*\(/, /\.toThrow\s*\(/, /\.toHaveBeenCalled/, /\.resolves\./, /\.rejects\./,
];

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; message: string; severity: 'error' | 'warning' }> = [
  { pattern: /\bit\.skip\s*\(/g, message: 'Skipped test detected (it.skip). Remove or fix before merging.', severity: 'error' },
  { pattern: /\bdescribe\.skip\s*\(/g, message: 'Skipped test suite detected (describe.skip). Remove or fix before merging.', severity: 'error' },
  { pattern: /\bit\.only\s*\(/g, message: 'Focused test detected (it.only). Prevents other tests from running in CI.', severity: 'error' },
  { pattern: /\bdescribe\.only\s*\(/g, message: 'Focused test suite detected (describe.only). Prevents other suites from running.', severity: 'error' },
  { pattern: /\bconsole\.(log|warn|error|info|debug)\s*\(/g, message: 'Console statement in test file. Use proper assertions instead.', severity: 'warning' },
  { pattern: /\bsetTimeout\s*\([^,]+,\s*\d{4,}\)/g, message: 'Long timeout detected (>= 1000ms). Use fake timers instead.', severity: 'warning' },
  { pattern: /\b(localhost|127\.0\.0\.1|0\.0\.0\.0)\b/g, message: 'Hardcoded host address in test. Use environment variables or test fixtures.', severity: 'warning' },
];

export function validateTests(content: string, filePath?: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const lines = content.split('\n');
  const fileName = filePath?.split(/[/\\]/).pop() ?? '';

  // Stats
  const describeBlocks = (content.match(/\bdescribe\s*\(/g) ?? []).length;
  const itBlocks = (content.match(/\bit\s*\(/g) ?? []).length;
  const skippedTests = (content.match(/\b(it|describe)\.skip\s*\(/g) ?? []).length;
  let assertions = 0;
  for (const pattern of ASSERTION_PATTERNS) {
    assertions += (content.match(new RegExp(pattern.source, 'g')) ?? []).length;
  }

  // File naming
  if (fileName && !/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(fileName)) {
    issues.push({ severity: 'error', message: `File '${fileName}' does not follow naming convention (*.test.ts or *.spec.ts)`, file: filePath });
  }

  // Must have describe block
  if (describeBlocks === 0) {
    issues.push({ severity: 'warning', message: 'No describe() block found. Tests should be grouped in describe blocks.', file: filePath });
  }

  // Must have test cases
  if (itBlocks === 0) {
    issues.push({ severity: 'error', message: 'No it() or test() blocks found. File contains no test cases.', file: filePath });
  }

  // Must have assertions
  if (itBlocks > 0 && assertions === 0) {
    issues.push({ severity: 'error', message: 'No assertions found (expect, assert). Tests without assertions are not testing anything.', file: filePath });
  }

  // Assertion density
  if (itBlocks > 0 && assertions < itBlocks) {
    issues.push({ severity: 'warning', message: `Low assertion density: ${assertions} assertion(s) for ${itBlocks} test(s).`, file: filePath });
  }

  // Forbidden patterns (line-by-line)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (const forbidden of FORBIDDEN_PATTERNS) {
      forbidden.pattern.lastIndex = 0;
      if (forbidden.pattern.test(line)) {
        issues.push({ severity: forbidden.severity, message: forbidden.message, file: filePath, line: i + 1 });
      }
    }
  }

  // Empty test blocks
  const emptyTestPattern = /\bit\s*\(\s*['"`][^'"`]*['"`]\s*,\s*\(\)\s*=>\s*\{\s*\}\s*\)/g;
  let emptyMatch;
  while ((emptyMatch = emptyTestPattern.exec(content)) !== null) {
    const lineNumber = (content.substring(0, emptyMatch.index).match(/\n/g) ?? []).length + 1;
    issues.push({ severity: 'error', message: 'Empty test body detected. Test does nothing.', file: filePath, line: lineNumber });
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const valid = errors === 0;
  const summary = `${itBlocks} test(s), ${assertions} assertion(s), ${skippedTests} skipped. ${valid ? 'All checks pass.' : `${errors} error(s) found.`}`;

  return { valid, issues, summary };
}
