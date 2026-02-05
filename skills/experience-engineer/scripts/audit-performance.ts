#!/usr/bin/env node
/**
 * Performance Audit Script (TypeScript)
 *
 * Static analysis of source files for common performance anti-patterns.
 * Checks: bundle size indicators, re-render triggers, memory leaks,
 * inefficient patterns, missing optimizations.
 *
 * Usage:
 *   npx tsx audit-performance.ts src/components/Dashboard.tsx
 *   npx tsx audit-performance.ts src/
 */

import * as fs from "fs";
import * as path from "path";

interface PerfIssue {
  severity: "error" | "warning" | "info";
  category: string;
  message: string;
  file: string;
  line: number;
}

const SOURCE_PATTERN = /\.(ts|tsx|js|jsx)$/;

interface PerfRule {
  id: string;
  category: string;
  severity: "error" | "warning" | "info";
  pattern: RegExp;
  message: string;
  fileFilter?: RegExp;
}

const RULES: PerfRule[] = [
  // Bundle size
  {
    id: "barrel-import",
    category: "Bundle Size",
    severity: "warning",
    pattern: /import\s+\{[^}]+\}\s+from\s+['"]lodash['"]/g,
    message: "Barrel import from lodash. Use 'lodash/function' for tree-shaking (saves ~70KB).",
  },
  {
    id: "moment-import",
    category: "Bundle Size",
    severity: "warning",
    pattern: /import\s+.*\s+from\s+['"]moment['"]/g,
    message: "moment.js imported (330KB gzipped). Use date-fns (7KB) or dayjs (2KB) instead.",
  },
  {
    id: "dynamic-import-missing",
    category: "Bundle Size",
    severity: "info",
    pattern: /import\s+.*\s+from\s+['"](chart\.js|three|@monaco-editor|ace-builds|codemirror|leaflet|mapbox-gl|pdf-lib|xlsx|exceljs)['"]/g,
    message: "Heavy library imported statically. Consider dynamic import() for code splitting.",
  },
  // React re-renders
  {
    id: "inline-object-prop",
    category: "Re-renders",
    severity: "warning",
    pattern: /\bstyle\s*=\s*\{\s*\{/g,
    message: "Inline style object creates new reference on every render. Extract to const or useMemo.",
    fileFilter: /\.(tsx|jsx)$/,
  },
  {
    id: "inline-function-prop",
    category: "Re-renders",
    severity: "info",
    pattern: /\bon\w+\s*=\s*\{\s*\(\s*\)\s*=>/g,
    message: "Inline arrow function as prop. Consider useCallback for expensive child components.",
    fileFilter: /\.(tsx|jsx)$/,
  },
  {
    id: "useeffect-no-deps",
    category: "Re-renders",
    severity: "warning",
    pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*\)\s*;/g,
    message: "useEffect without dependency array runs on every render. Add dependencies or empty array.",
    fileFilter: /\.(tsx|jsx)$/,
  },
  {
    id: "state-in-loop",
    category: "Re-renders",
    severity: "error",
    pattern: /\bfor\s*\(.*\)\s*\{[^}]*\bset[A-Z]\w*\s*\(/g,
    message: "setState called inside a loop. Batch state updates or use useReducer.",
    fileFilter: /\.(tsx|jsx)$/,
  },
  // Memory leaks
  {
    id: "event-listener-no-cleanup",
    category: "Memory",
    severity: "warning",
    pattern: /addEventListener\s*\([^)]+\)(?![\s\S]*?removeEventListener)/g,
    message: "addEventListener without corresponding removeEventListener. Potential memory leak.",
  },
  {
    id: "setinterval-no-clear",
    category: "Memory",
    severity: "warning",
    pattern: /setInterval\s*\(/g,
    message: "setInterval detected. Ensure clearInterval is called on cleanup.",
  },
  // Inefficient patterns
  {
    id: "nested-loop",
    category: "Algorithm",
    severity: "info",
    pattern: /\bfor\s*\([^)]+\)\s*\{[^}]*\bfor\s*\([^)]+\)/g,
    message: "Nested loop detected (O(n\u00B2)). Consider Map/Set for O(n) lookups on large datasets.",
  },
  {
    id: "spread-in-reduce",
    category: "Algorithm",
    severity: "warning",
    pattern: /\.reduce\s*\([^)]*\.\.\./g,
    message: "Spread operator inside reduce() creates O(n\u00B2) copies. Use mutation inside reduce.",
  },
  // DOM
  {
    id: "layout-thrashing",
    category: "DOM",
    severity: "warning",
    pattern: /\b(offsetWidth|offsetHeight|clientWidth|clientHeight|scrollWidth|scrollHeight|getBoundingClientRect)\b/g,
    message: "Layout property access detected. Batch reads/writes to prevent layout thrashing.",
  },
];

function auditFile(filePath: string): PerfIssue[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const issues: PerfIssue[] = [];

  for (const rule of RULES) {
    if (rule.fileFilter && !rule.fileFilter.test(filePath)) continue;

    for (let i = 0; i < lines.length; i++) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(lines[i])) {
        issues.push({ severity: rule.severity, category: rule.category, message: rule.message, file: filePath, line: i + 1 });
      }
    }
  }

  // Large component check
  if (/\.(tsx|jsx)$/.test(filePath) && lines.length > 300) {
    issues.push({
      severity: "info", category: "Architecture",
      message: `Component file has ${lines.length} lines. Consider splitting for better re-render isolation.`,
      file: filePath, line: 0,
    });
  }

  return issues;
}

function findSourceFiles(dir: string): string[] {
  const files: string[] = [];
  function walk(d: string) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory() && !["node_modules", ".next", "dist", "build", "__tests__"].includes(entry.name)) {
        walk(fullPath);
      } else if (entry.isFile() && SOURCE_PATTERN.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  walk(dir);
  return files;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npx tsx audit-performance.ts <file_or_directory>");
    console.log("\nExamples:");
    console.log("  npx tsx audit-performance.ts src/components/Dashboard.tsx");
    console.log("  npx tsx audit-performance.ts src/");
    process.exit(1);
  }

  const input = args[0];
  let files: string[];
  const stat = fs.statSync(input);

  if (stat.isDirectory()) {
    files = findSourceFiles(input);
    if (files.length === 0) { console.log(`No source files found in '${input}'`); process.exit(0); }
  } else {
    files = [input];
  }

  const allIssues: PerfIssue[] = [];
  for (const file of files) { allIssues.push(...auditFile(file)); }

  const errors = allIssues.filter((i) => i.severity === "error");
  const warnings = allIssues.filter((i) => i.severity === "warning");
  const infos = allIssues.filter((i) => i.severity === "info");

  console.log(`\nPerformance Audit Report`);
  console.log("─────────────────────────────────────");
  console.log(`Scanned ${files.length} file(s)`);

  if (allIssues.length > 0) {
    const byCategory = new Map<string, PerfIssue[]>();
    for (const issue of allIssues) {
      if (!byCategory.has(issue.category)) byCategory.set(issue.category, []);
      byCategory.get(issue.category)!.push(issue);
    }

    for (const [category, catIssues] of byCategory) {
      console.log(`\n${category} (${catIssues.length} issue(s)):`);
      for (const issue of catIssues.slice(0, 15)) {
        const icon = issue.severity === "error" ? "  ❌" : issue.severity === "warning" ? "  ⚠️ " : "  ℹ️ ";
        const relPath = path.relative(process.cwd(), issue.file);
        const location = issue.line > 0 ? `:${issue.line}` : "";
        console.log(`${icon} ${relPath}${location}`);
        console.log(`     ${issue.message}`);
      }
      if (catIssues.length > 15) console.log(`  ... and ${catIssues.length - 15} more`);
    }
  }

  console.log("\n─────────────────────────────────────");
  if (errors.length > 0) {
    console.log(`❌ ${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info(s)`);
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log(`⚠️  ${warnings.length} warning(s), ${infos.length} info(s)`);
    process.exit(0);
  } else if (infos.length > 0) {
    console.log(`ℹ️  ${infos.length} suggestion(s) for optimization`);
    process.exit(0);
  } else {
    console.log("✅ No performance anti-patterns detected");
    process.exit(0);
  }
}

main();
