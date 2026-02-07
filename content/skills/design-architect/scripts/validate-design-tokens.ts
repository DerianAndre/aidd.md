#!/usr/bin/env node
/**
 * Design Token Validator (TypeScript)
 *
 * Validates design token files (JSON/CSS) for consistency, naming conventions,
 * color format validity, and completeness of token categories.
 *
 * Usage:
 *   npx tsx validate-design-tokens.ts tokens.json
 *   npx tsx validate-design-tokens.ts src/styles/theme.css
 *   npx tsx validate-design-tokens.ts design-tokens/
 */

import * as fs from "fs";
import * as path from "path";

interface ValidationIssue {
  severity: "error" | "warning" | "info";
  message: string;
  file?: string;
}

interface TokenReport {
  file: string;
  format: "json" | "css" | "unknown";
  tokenCount: number;
  issues: ValidationIssue[];
  categories: Map<string, number>;
}

const EXPECTED_CATEGORIES = ["color", "spacing", "font", "radius", "shadow", "breakpoint", "z-index", "transition"];
const KEBAB_CASE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function parseColorToRGB(color: string): { r: number; g: number; b: number } | null {
  const hexMatch = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hexMatch) return { r: parseInt(hexMatch[1], 16), g: parseInt(hexMatch[2], 16), b: parseInt(hexMatch[3], 16) };

  const shortHexMatch = color.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (shortHexMatch) return { r: parseInt(shortHexMatch[1] + shortHexMatch[1], 16), g: parseInt(shortHexMatch[2] + shortHexMatch[2], 16), b: parseInt(shortHexMatch[3] + shortHexMatch[3], 16) };

  const rgbMatch = color.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) return { r: parseInt(rgbMatch[1]), g: parseInt(rgbMatch[2]), b: parseInt(rgbMatch[3]) };

  return null;
}

function validateJSONTokens(filePath: string, data: Record<string, any>): TokenReport {
  const issues: ValidationIssue[] = [];
  const categories = new Map<string, number>();
  let tokenCount = 0;

  function walkTokens(obj: Record<string, any>, prefix = "") {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (!KEBAB_CASE_PATTERN.test(key) && !/^\$/.test(key)) {
        issues.push({ severity: "warning", message: `Token key '${fullKey}' is not kebab-case.`, file: filePath });
      }

      if (typeof value === "object" && value !== null && !value.$value) {
        walkTokens(value, fullKey);
      } else {
        tokenCount++;
        const category = prefix ? prefix.split(".")[0] : key.split("-")[0];
        categories.set(category, (categories.get(category) || 0) + 1);

        const tokenValue = typeof value === "object" ? value.$value || value.value : value;
        if (typeof tokenValue === "string" && (fullKey.includes("color") || tokenValue.startsWith("#"))) {
          if (tokenValue.startsWith("#") && !parseColorToRGB(tokenValue)) {
            issues.push({ severity: "error", message: `Invalid color value '${tokenValue}' for token '${fullKey}'.`, file: filePath });
          }
        }
      }
    }
  }

  walkTokens(data);

  for (const expected of EXPECTED_CATEGORIES) {
    if (![...categories.keys()].some((k) => k.includes(expected) || expected.includes(k))) {
      issues.push({ severity: "info", message: `Missing token category: '${expected}'.`, file: filePath });
    }
  }

  return { file: filePath, format: "json", tokenCount, issues, categories };
}

function validateCSSTokens(filePath: string): TokenReport {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const issues: ValidationIssue[] = [];
  const categories = new Map<string, number>();
  let tokenCount = 0;
  const varNames: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const varMatch = line.match(/--([a-z][a-z0-9-]*)\s*:\s*(.+?)\s*;/);

    if (varMatch) {
      tokenCount++;
      const varName = varMatch[1];
      const varValue = varMatch[2];
      const category = varName.split("-")[0];
      categories.set(category, (categories.get(category) || 0) + 1);

      if (category === "spacing" && /^\d+px$/.test(varValue) && parseInt(varValue) % 4 !== 0) {
        issues.push({ severity: "warning", message: `Spacing token '--${varName}: ${varValue}' is not on a 4px grid.`, file: filePath });
      }

      if (varNames.includes(varName)) {
        issues.push({ severity: "error", message: `Duplicate CSS variable: '--${varName}'.`, file: filePath });
      }
      varNames.push(varName);
    }

    // Check hardcoded colors not using tokens
    if (!line.includes("--") && !line.trim().startsWith("//") && !line.trim().startsWith("/*")) {
      if (/:\s*#[0-9a-f]{3,8}\s*;/i.test(line)) {
        issues.push({ severity: "warning", message: `Hardcoded color on line ${i + 1}. Use a CSS custom property instead.`, file: filePath });
      }
    }
  }

  return { file: filePath, format: "css", tokenCount, issues, categories };
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npx tsx validate-design-tokens.ts <file_or_directory>");
    console.log("\nSupported formats: JSON (W3C DTCG), CSS custom properties");
    console.log("\nExamples:");
    console.log("  npx tsx validate-design-tokens.ts tokens.json");
    console.log("  npx tsx validate-design-tokens.ts src/styles/theme.css");
    process.exit(1);
  }

  const input = args[0];
  const reports: TokenReport[] = [];

  const stat = fs.statSync(input);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(input)) {
      const fullPath = path.join(input, entry);
      if (entry.endsWith(".json")) {
        reports.push(validateJSONTokens(fullPath, JSON.parse(fs.readFileSync(fullPath, "utf-8"))));
      } else if (entry.endsWith(".css")) {
        reports.push(validateCSSTokens(fullPath));
      }
    }
  } else if (input.endsWith(".json")) {
    reports.push(validateJSONTokens(input, JSON.parse(fs.readFileSync(input, "utf-8"))));
  } else if (input.endsWith(".css")) {
    reports.push(validateCSSTokens(input));
  } else {
    console.error("Unsupported file format. Use .json or .css");
    process.exit(1);
  }

  if (reports.length === 0) { console.log("No token files found."); process.exit(0); }

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalTokens = 0;

  console.log(`\nDesign Token Validation Report`);
  console.log("─────────────────────────────────────");

  for (const report of reports) {
    const errors = report.issues.filter((i) => i.severity === "error");
    const warnings = report.issues.filter((i) => i.severity === "warning");
    totalErrors += errors.length;
    totalWarnings += warnings.length;
    totalTokens += report.tokenCount;

    const relPath = path.relative(process.cwd(), report.file);
    console.log(`\n${relPath} (${report.format.toUpperCase()}, ${report.tokenCount} tokens)`);

    if (report.categories.size > 0) {
      const cats = [...report.categories.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(", ");
      console.log(`   Categories: ${cats}`);
    }

    for (const issue of report.issues) {
      const icon = issue.severity === "error" ? "  ❌" : issue.severity === "warning" ? "  ⚠️ " : "  ℹ️ ";
      console.log(`${icon} ${issue.message}`);
    }
  }

  console.log("\n─────────────────────────────────────");
  console.log(`Total: ${totalTokens} tokens across ${reports.length} file(s)`);

  if (totalErrors > 0) {
    console.log(`❌ ${totalErrors} error(s), ${totalWarnings} warning(s)`);
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log(`⚠️  ${totalWarnings} warning(s)`);
    process.exit(0);
  } else {
    console.log("✅ All design tokens are valid and consistent");
    process.exit(0);
  }
}

main();
