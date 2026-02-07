#!/usr/bin/env node
/**
 * Technology Knowledge Base (TKB) Entry Validator (TypeScript)
 *
 * Validates TKB markdown entries for required frontmatter, sections,
 * quantified metrics, and structural consistency.
 *
 * Usage:
 *   npx tsx validate-tkb-entry.ts knowledge/runtimes/bun.md
 *   npx tsx validate-tkb-entry.ts knowledge/
 */

import * as fs from "fs";
import * as path from "path";

interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
  file?: string;
}

const REQUIRED_FRONTMATTER = ["name", "category", "last_updated", "maturity"];
const VALID_CATEGORIES = ["runtime", "frontend", "backend", "data", "testing", "infrastructure", "security", "tooling", "pattern"];
const VALID_MATURITY = ["stable", "emerging", "experimental", "deprecated"];
const REQUIRED_SECTIONS = ["Overview", "Key Metrics", "Use Cases", "Trade-offs", "Alternatives", "References"];

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; bodyStart: number } | null {
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const frontmatter: Record<string, string> = {};
  for (const line of fmMatch[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      frontmatter[line.substring(0, colonIdx).trim()] = line.substring(colonIdx + 1).trim();
    }
  }

  return { frontmatter, bodyStart: fmMatch[0].length };
}

function extractSections(content: string): string[] {
  const sections: string[] = [];
  const matches = content.matchAll(/^##\s+(.+)$/gm);
  for (const match of matches) {
    sections.push(match[1].replace(/[*_`]/g, "").replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim());
  }
  return sections;
}

function validateEntry(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  const issues: ValidationIssue[] = [];

  const parsed = parseFrontmatter(content);
  if (!parsed) {
    issues.push({ severity: "error", message: "Missing YAML frontmatter. Must start with '---' and contain required fields.", file: filePath });
    return { file: filePath, frontmatter: {}, sections: [], issues };
  }

  const { frontmatter } = parsed;

  for (const field of REQUIRED_FRONTMATTER) {
    if (!frontmatter[field]) {
      issues.push({ severity: "error", message: `Missing required frontmatter field: '${field}'`, file: filePath });
    }
  }

  if (frontmatter.category && !VALID_CATEGORIES.includes(frontmatter.category)) {
    issues.push({ severity: "error", message: `Invalid category '${frontmatter.category}'. Must be one of: ${VALID_CATEGORIES.join(", ")}`, file: filePath });
  }

  if (frontmatter.maturity && !VALID_MATURITY.includes(frontmatter.maturity)) {
    issues.push({ severity: "error", message: `Invalid maturity '${frontmatter.maturity}'. Must be one of: ${VALID_MATURITY.join(", ")}`, file: filePath });
  }

  if (frontmatter.last_updated) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(frontmatter.last_updated)) {
      issues.push({ severity: "error", message: `Invalid date format '${frontmatter.last_updated}'. Must be YYYY-MM-DD.`, file: filePath });
    } else {
      const entryDate = new Date(frontmatter.last_updated);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      if (entryDate < sixMonthsAgo) {
        issues.push({ severity: "warning", message: `Entry last updated ${frontmatter.last_updated} (> 6 months ago). Consider reviewing.`, file: filePath });
      }
    }
  }

  const sections = extractSections(content);
  for (const required of REQUIRED_SECTIONS) {
    if (!sections.some((s) => s.toLowerCase().includes(required.toLowerCase()))) {
      issues.push({ severity: "error", message: `Missing required section: '${required}'`, file: filePath });
    }
  }

  const body = content.substring(parsed.bodyStart);

  // Check for vague language
  const vagueTerms = [
    { term: "very fast", suggestion: "Use specific metric (e.g., '70k req/s')" },
    { term: "high performance", suggestion: "Quantify (e.g., '40% faster than X')" },
    { term: "lightweight", suggestion: "Quantify (e.g., '2MB bundle size')" },
    { term: "easy to use", suggestion: "Describe specific DX features" },
    { term: "popular", suggestion: "Cite metrics (e.g., '50k GitHub stars')" },
  ];

  for (const { term, suggestion } of vagueTerms) {
    if (body.toLowerCase().includes(term)) {
      issues.push({ severity: "warning", message: `Vague language: '${term}'. ${suggestion}`, file: filePath });
    }
  }

  // Check use case scores
  const useCaseSection = body.match(/## .*Use Cases[\s\S]*?(?=##|$)/i);
  if (useCaseSection && !/\b([1-9]|10)\s*\/\s*10\b/.test(useCaseSection[0])) {
    issues.push({ severity: "warning", message: "Use Cases section has no numeric scores (e.g., '8/10').", file: filePath });
  }

  // Check references have URLs
  const refsSection = body.match(/## .*References[\s\S]*?(?=##|$)/i);
  if (refsSection && !/https?:\/\//.test(refsSection[0])) {
    issues.push({ severity: "warning", message: "References section has no URLs. Cite sources.", file: filePath });
  }

  // Check alternatives has a table
  const altSection = body.match(/## .*Alternatives[\s\S]*?(?=##|$)/i);
  if (altSection && !/\|.*\|/.test(altSection[0])) {
    issues.push({ severity: "warning", message: "Alternatives section has no comparison table.", file: filePath });
  }

  return { file: filePath, frontmatter, sections, issues };
}

function findTKBFiles(dir: string): string[] {
  const files: string[] = [];
  function walk(d: string) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") files.push(fullPath);
    }
  }
  walk(dir);
  return files;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npx tsx validate-tkb-entry.ts <file_or_directory>");
    console.log("\nExamples:");
    console.log("  npx tsx validate-tkb-entry.ts knowledge/runtimes/bun.md");
    console.log("  npx tsx validate-tkb-entry.ts knowledge/");
    process.exit(1);
  }

  const input = args[0];
  let files: string[];
  const stat = fs.statSync(input);

  if (stat.isDirectory()) {
    files = findTKBFiles(input);
    if (files.length === 0) { console.log(`No markdown files found in '${input}'`); process.exit(0); }
  } else {
    files = [input];
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  let validEntries = 0;

  for (const file of files) {
    const report = validateEntry(file);
    const errors = report.issues.filter((i) => i.severity === "error");
    const warnings = report.issues.filter((i) => i.severity === "warning");
    totalErrors += errors.length;
    totalWarnings += warnings.length;
    if (errors.length === 0) validEntries++;

    if (report.issues.length > 0) {
      const relPath = path.relative(process.cwd(), file);
      console.log(`\n${relPath}:`);
      if (report.frontmatter.name) {
        console.log(`  ${report.frontmatter.name} (${report.frontmatter.maturity || "unknown"})`);
      }
      for (const issue of report.issues) {
        const icon = issue.severity === "error" ? "  ❌" : "  ⚠️ ";
        console.log(`${icon} ${issue.message}`);
      }
    }
  }

  console.log("\n─────────────────────────────────────");
  console.log(`TKB Validation: ${files.length} entries, ${validEntries} valid`);

  if (totalErrors > 0) {
    console.log(`   ❌ ${totalErrors} error(s), ${totalWarnings} warning(s)`);
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log(`   ⚠️  ${totalWarnings} warning(s)`);
    process.exit(0);
  } else {
    console.log("   ✅ All TKB entries follow the required schema");
    process.exit(0);
  }
}

main();
