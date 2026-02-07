#!/usr/bin/env node
/**
 * Accessibility Audit Script (TypeScript)
 *
 * Static analysis of HTML/JSX/TSX files for common accessibility violations.
 * Checks: missing alt text, missing ARIA labels, form labels, heading order,
 * keyboard navigation, focus management.
 *
 * Usage:
 *   npx tsx audit-accessibility.ts src/components/Button.tsx
 *   npx tsx audit-accessibility.ts src/
 */

import * as fs from "fs";
import * as path from "path";

interface A11yIssue {
  severity: "error" | "warning";
  rule: string;
  message: string;
  file: string;
  line: number;
}

const FILE_PATTERN = /\.(tsx|jsx|html|vue|svelte)$/;

interface A11yRule {
  id: string;
  severity: "error" | "warning";
  pattern: RegExp;
  message: string;
}

const RULES: A11yRule[] = [
  {
    id: "img-alt",
    severity: "error",
    pattern: /<img\b(?![^>]*\balt\s*=)/gi,
    message: "Image missing 'alt' attribute. Required for screen readers (WCAG 1.1.1).",
  },
  {
    id: "img-alt-empty",
    severity: "warning",
    pattern: /<img\b[^>]*\balt\s*=\s*["']\s*["']/gi,
    message: "Image has empty alt text. Use descriptive text or role='presentation' for decorative images.",
  },
  {
    id: "button-content",
    severity: "error",
    pattern: /<button\b[^>]*>\s*<\/button>/gi,
    message: "Empty button element. Buttons must have text content or aria-label (WCAG 4.1.2).",
  },
  {
    id: "a-content",
    severity: "error",
    pattern: /<a\b[^>]*>\s*<\/a>/gi,
    message: "Empty anchor element. Links must have descriptive text (WCAG 2.4.4).",
  },
  {
    id: "a-target-blank",
    severity: "warning",
    pattern: /<a\b[^>]*target\s*=\s*["']_blank["'](?![^>]*rel\s*=\s*["'][^"']*noopener)/gi,
    message: "Link opens in new tab without rel='noopener'. Security and usability issue.",
  },
  {
    id: "input-label",
    severity: "error",
    pattern: /<input\b(?![^>]*\b(aria-label|aria-labelledby|id)\s*=)(?![^>]*\btype\s*=\s*["'](hidden|submit|button|reset)["'])/gi,
    message: "Input element missing label association (WCAG 1.3.1).",
  },
  {
    id: "select-label",
    severity: "error",
    pattern: /<select\b(?![^>]*\b(aria-label|aria-labelledby)\s*=)/gi,
    message: "Select element missing aria-label or aria-labelledby (WCAG 1.3.1).",
  },
  {
    id: "aria-hidden-focusable",
    severity: "error",
    pattern: /aria-hidden\s*=\s*["']true["'][^>]*(?:tabIndex\s*=\s*["'][^-][^"']*["']|href\s*=)/gi,
    message: "Element is aria-hidden but focusable. Hidden elements must not be in tab order (WCAG 4.1.2).",
  },
  {
    id: "onclick-no-key",
    severity: "warning",
    pattern: /\bonClick\s*=(?![^>]*\b(onKeyDown|onKeyUp|onKeyPress|role\s*=\s*["']button["'])\b)/gi,
    message: "onClick without keyboard handler. Add onKeyDown or use a button element (WCAG 2.1.1).",
  },
  {
    id: "tabindex-positive",
    severity: "warning",
    pattern: /tabIndex\s*=\s*\{?\s*["']?[1-9]\d*/gi,
    message: "Positive tabIndex disrupts natural tab order. Use tabIndex={0} or tabIndex={-1} only.",
  },
  {
    id: "div-click",
    severity: "warning",
    pattern: /<div\b[^>]*\bonClick\b(?![^>]*\brole\s*=)/gi,
    message: "Clickable div without role attribute. Use button or add role='button'.",
  },
  {
    id: "span-click",
    severity: "warning",
    pattern: /<span\b[^>]*\bonClick\b(?![^>]*\brole\s*=)/gi,
    message: "Clickable span without role attribute. Use button or add role='button'.",
  },
  {
    id: "video-captions",
    severity: "error",
    pattern: /<video\b(?![^>]*\b(track|captions))/gi,
    message: "Video element without captions track. Required by WCAG 1.2.2.",
  },
  {
    id: "heading-empty",
    severity: "error",
    pattern: /<h[1-6]\b[^>]*>\s*<\/h[1-6]>/gi,
    message: "Empty heading element. Headings must have content (WCAG 1.3.1).",
  },
  {
    id: "autoplay",
    severity: "warning",
    pattern: /\bautoPlay\b|\bautoplay\b/gi,
    message: "autoplay detected. Provide pause controls (WCAG 1.4.2).",
  },
];

function auditFile(filePath: string): A11yIssue[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const issues: A11yIssue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of RULES) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(line)) {
        issues.push({ severity: rule.severity, rule: rule.id, message: rule.message, file: filePath, line: i + 1 });
      }
    }
  }

  // Check heading order
  const headingLevels: number[] = [];
  for (const line of lines) {
    const match = line.match(/<h([1-6])\b/i);
    if (match) headingLevels.push(parseInt(match[1], 10));
  }

  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] > headingLevels[i - 1] + 1) {
      issues.push({
        severity: "warning", rule: "heading-order",
        message: `Heading level skipped: h${headingLevels[i - 1]} to h${headingLevels[i]}. Don't skip levels (WCAG 1.3.1).`,
        file: filePath, line: 0,
      });
      break;
    }
  }

  return issues;
}

function findFiles(dir: string): string[] {
  const files: string[] = [];
  function walk(d: string) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".next") {
        walk(fullPath);
      } else if (entry.isFile() && FILE_PATTERN.test(entry.name)) {
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
    console.log("Usage: npx tsx audit-accessibility.ts <file_or_directory>");
    console.log("\nExamples:");
    console.log("  npx tsx audit-accessibility.ts src/components/Button.tsx");
    console.log("  npx tsx audit-accessibility.ts src/");
    process.exit(1);
  }

  const input = args[0];
  let files: string[];

  const stat = fs.statSync(input);
  if (stat.isDirectory()) {
    files = findFiles(input);
    if (files.length === 0) { console.log(`No JSX/TSX/HTML files found in '${input}'`); process.exit(0); }
  } else {
    files = [input];
  }

  const allIssues: A11yIssue[] = [];
  for (const file of files) { allIssues.push(...auditFile(file)); }

  const errors = allIssues.filter((i) => i.severity === "error");
  const warnings = allIssues.filter((i) => i.severity === "warning");

  console.log(`\nAccessibility Audit Report`);
  console.log("─────────────────────────────────────");
  console.log(`Scanned ${files.length} file(s)`);

  if (allIssues.length > 0) {
    const byFile = new Map<string, A11yIssue[]>();
    for (const issue of allIssues) {
      const relPath = path.relative(process.cwd(), issue.file);
      if (!byFile.has(relPath)) byFile.set(relPath, []);
      byFile.get(relPath)!.push(issue);
    }

    for (const [file, fileIssues] of byFile) {
      console.log(`\n${file}:`);
      for (const issue of fileIssues) {
        const icon = issue.severity === "error" ? "  ❌" : "  ⚠️ ";
        const location = issue.line > 0 ? ` (line ${issue.line})` : "";
        console.log(`${icon}${location} [${issue.rule}] ${issue.message}`);
      }
    }

    const ruleBreakdown = new Map<string, number>();
    for (const issue of allIssues) { ruleBreakdown.set(issue.rule, (ruleBreakdown.get(issue.rule) || 0) + 1); }
    console.log("\n   Rule Summary:");
    for (const [rule, count] of [...ruleBreakdown.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`   ${rule}: ${count}`);
    }
  }

  console.log("\n─────────────────────────────────────");
  if (errors.length > 0) {
    console.log(`❌ ${errors.length} error(s), ${warnings.length} warning(s)`);
    console.log("\nReference: https://www.w3.org/WAI/WCAG22/quickref/");
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log(`⚠️  ${warnings.length} warning(s)`);
    process.exit(0);
  } else {
    console.log("✅ No accessibility issues detected");
    console.log("Note: Static analysis cannot catch all a11y issues. Test with screen readers and keyboard.");
    process.exit(0);
  }
}

main();
