#!/usr/bin/env node
/**
 * Test Suite Validator (TypeScript)
 *
 * Validates test file structure, naming conventions, and patterns.
 * Checks: file naming, describe/it blocks, assertion presence,
 * forbidden patterns (skipped tests, console.log, hardcoded values).
 *
 * Usage:
 *   npx tsx validate-tests.ts src/__tests__/MyService.test.ts
 *   npx tsx validate-tests.ts src/
 */

import * as fs from "fs";
import * as path from "path";

interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
  file?: string;
  line?: number;
}

interface TestFileReport {
  file: string;
  issues: ValidationIssue[];
  stats: {
    describeBlocks: number;
    itBlocks: number;
    assertions: number;
    skippedTests: number;
  };
}

const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx)$/;

const ASSERTION_PATTERNS = [
  /expect\s*\(/,
  /assert\s*[\.(]/,
  /\.toEqual\s*\(/,
  /\.toBe\s*\(/,
  /\.toMatch\s*\(/,
  /\.toThrow\s*\(/,
  /\.toHaveBeenCalled/,
  /\.resolves\./,
  /\.rejects\./,
];

const FORBIDDEN_PATTERNS: Array<{
  pattern: RegExp;
  message: string;
  severity: "error" | "warning";
}> = [
  {
    pattern: /\bit\.skip\s*\(/g,
    message: "Skipped test detected (it.skip). Remove or fix before merging.",
    severity: "error",
  },
  {
    pattern: /\bdescribe\.skip\s*\(/g,
    message:
      "Skipped test suite detected (describe.skip). Remove or fix before merging.",
    severity: "error",
  },
  {
    pattern: /\bit\.only\s*\(/g,
    message:
      "Focused test detected (it.only). This will prevent other tests from running in CI.",
    severity: "error",
  },
  {
    pattern: /\bdescribe\.only\s*\(/g,
    message:
      "Focused test suite detected (describe.only). This will prevent other suites from running.",
    severity: "error",
  },
  {
    pattern: /\bconsole\.(log|warn|error|info|debug)\s*\(/g,
    message:
      "Console statement in test file. Use proper assertions instead of manual inspection.",
    severity: "warning",
  },
  {
    pattern: /\bsetTimeout\s*\([^,]+,\s*\d{4,}\)/g,
    message:
      "Long timeout detected (>= 1000ms). Use fake timers (vi.useFakeTimers) instead.",
    severity: "warning",
  },
  {
    pattern: /\b(localhost|127\.0\.0\.1|0\.0\.0\.0)\b/g,
    message:
      "Hardcoded host address in test. Use environment variables or test fixtures.",
    severity: "warning",
  },
];

function validateTestFile(filePath: string): TestFileReport {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const issues: ValidationIssue[] = [];
  const fileName = path.basename(filePath);

  // Stats
  const describeBlocks = (content.match(/\bdescribe\s*\(/g) || []).length;
  const itBlocks = (content.match(/\bit\s*\(/g) || []).length;
  const skippedTests =
    (content.match(/\b(it|describe)\.skip\s*\(/g) || []).length;

  let assertions = 0;
  for (const pattern of ASSERTION_PATTERNS) {
    assertions += (content.match(new RegExp(pattern.source, "g")) || []).length;
  }

  // Check 1: File naming convention
  if (!TEST_FILE_PATTERN.test(fileName)) {
    issues.push({
      severity: "error",
      message: `File '${fileName}' does not follow naming convention (*.test.ts or *.spec.ts)`,
      file: filePath,
    });
  }

  // Check 2: Must have at least one describe block
  if (describeBlocks === 0) {
    issues.push({
      severity: "warning",
      message: "No describe() block found. Tests should be grouped in describe blocks.",
      file: filePath,
    });
  }

  // Check 3: Must have at least one test case
  if (itBlocks === 0) {
    issues.push({
      severity: "error",
      message: "No it() or test() blocks found. File contains no test cases.",
      file: filePath,
    });
  }

  // Check 4: Tests should have assertions
  if (itBlocks > 0 && assertions === 0) {
    issues.push({
      severity: "error",
      message:
        "No assertions found (expect, assert). Tests without assertions are not testing anything.",
      file: filePath,
    });
  }

  // Check 5: Assertion-to-test ratio
  if (itBlocks > 0 && assertions < itBlocks) {
    issues.push({
      severity: "warning",
      message: `Low assertion density: ${assertions} assertion(s) for ${itBlocks} test(s). Some tests may lack assertions.`,
      file: filePath,
    });
  }

  // Check 6: Forbidden patterns (line-by-line for line numbers)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const forbidden of FORBIDDEN_PATTERNS) {
      forbidden.pattern.lastIndex = 0;
      if (forbidden.pattern.test(line)) {
        issues.push({
          severity: forbidden.severity,
          message: forbidden.message,
          file: filePath,
          line: i + 1,
        });
      }
    }
  }

  // Check 7: Empty test blocks
  const emptyTestPattern = /\bit\s*\(\s*['"`][^'"`]*['"`]\s*,\s*\(\)\s*=>\s*\{\s*\}\s*\)/g;
  let emptyMatch;
  while ((emptyMatch = emptyTestPattern.exec(content)) !== null) {
    const beforeMatch = content.substring(0, emptyMatch.index);
    const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
    issues.push({
      severity: "error",
      message: "Empty test body detected. Test does nothing.",
      file: filePath,
      line: lineNumber,
    });
  }

  return {
    file: filePath,
    issues,
    stats: { describeBlocks, itBlocks, assertions, skippedTests },
  };
}

function findTestFiles(dirPath: string): string[] {
  const files: string[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "node_modules") {
        walk(fullPath);
      } else if (entry.isFile() && TEST_FILE_PATTERN.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  walk(dirPath);
  return files;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npx tsx validate-tests.ts <file_or_directory>");
    console.log("\nExamples:");
    console.log("  npx tsx validate-tests.ts src/__tests__/MyService.test.ts");
    console.log("  npx tsx validate-tests.ts src/");
    process.exit(1);
  }

  const input = args[0];
  let files: string[];

  const stat = fs.statSync(input);
  if (stat.isDirectory()) {
    files = findTestFiles(input);
    if (files.length === 0) {
      console.log(`No test files found in '${input}'`);
      process.exit(0);
    }
  } else {
    files = [input];
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalTests = 0;
  let totalAssertions = 0;
  let totalSkipped = 0;

  for (const file of files) {
    const report = validateTestFile(file);
    const errors = report.issues.filter((i) => i.severity === "error");
    const warnings = report.issues.filter((i) => i.severity === "warning");

    totalErrors += errors.length;
    totalWarnings += warnings.length;
    totalTests += report.stats.itBlocks;
    totalAssertions += report.stats.assertions;
    totalSkipped += report.stats.skippedTests;

    if (report.issues.length > 0) {
      const relPath = path.relative(process.cwd(), file);
      console.log(`\n${relPath}:`);

      for (const issue of report.issues) {
        const icon = issue.severity === "error" ? "  ❌" : "  ⚠️ ";
        const location = issue.line ? ` (line ${issue.line})` : "";
        console.log(`${icon}${location} ${issue.message}`);
      }
    }
  }

  // Summary
  console.log("\n─────────────────────────────────────");
  console.log(
    `📊 Test Suite Summary: ${files.length} file(s), ${totalTests} test(s), ${totalAssertions} assertion(s)`
  );

  if (totalSkipped > 0) {
    console.log(`   ⏭️  ${totalSkipped} skipped test(s)`);
  }

  if (totalErrors > 0) {
    console.log(`   ❌ ${totalErrors} error(s), ${totalWarnings} warning(s)`);
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log(`   ⚠️  ${totalWarnings} warning(s)`);
    process.exit(0);
  } else {
    console.log("   ✅ All test files pass validation");
    process.exit(0);
  }
}

main();
