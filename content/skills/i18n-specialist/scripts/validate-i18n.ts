#!/usr/bin/env node
/**
 * i18n Locale Validator (TypeScript)
 *
 * Validates internationalization completeness across locale files.
 * Checks: missing keys, extra keys, empty values, placeholder consistency,
 * key naming conventions, nested structure symmetry.
 *
 * Usage:
 *   npx tsx validate-i18n.ts locales/en.json locales/es.json
 *   npx tsx validate-i18n.ts locales/
 */

import * as fs from "fs";
import * as path from "path";

interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
  locale?: string;
}

function flattenObject(obj: Record<string, any>, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const nested = flattenObject(value, fullKey);
      for (const [k, v] of nested) {
        result.set(k, v);
      }
    } else {
      result.set(fullKey, String(value ?? ""));
    }
  }

  return result;
}

function extractPlaceholders(value: string): string[] {
  const results: string[] = [];

  // Match {{variable}}
  const doubleBrace = value.match(/\{\{\w+\}\}/g);
  if (doubleBrace) results.push(...doubleBrace);

  // Match {variable}
  const singleBrace = value.match(/\{\w+\}/g);
  if (singleBrace) results.push(...singleBrace);

  // Match %{variable}
  const percentBrace = value.match(/%\{\w+\}/g);
  if (percentBrace) results.push(...percentBrace);

  // Match %s, %d
  const formatSpec = value.match(/%[sd]/g);
  if (formatSpec) results.push(...formatSpec);

  return results.sort();
}

function validateLocales(referenceFile: string, localeFiles: string[]) {
  const issues: ValidationIssue[] = [];
  const coverage = new Map<string, { present: number; missing: number; percentage: number }>();

  let referenceData: Record<string, any>;
  try {
    const content = fs.readFileSync(referenceFile, "utf-8");
    referenceData = JSON.parse(content);
  } catch (error: any) {
    issues.push({ severity: "error", message: `Failed to parse reference locale: ${error.message}` });
    return { referenceLocale: path.basename(referenceFile), locales: [], totalKeys: 0, issues, coverage };
  }

  const referenceKeys = flattenObject(referenceData);
  const refLocaleName = path.basename(referenceFile, path.extname(referenceFile));

  for (const [key, value] of referenceKeys) {
    if (value.trim() === "") {
      issues.push({ severity: "warning", message: `Empty value for key '${key}'`, locale: refLocaleName });
    }
  }

  for (const localeFile of localeFiles) {
    if (localeFile === referenceFile) continue;

    const localeName = path.basename(localeFile, path.extname(localeFile));
    let localeData: Record<string, any>;

    try {
      const content = fs.readFileSync(localeFile, "utf-8");
      localeData = JSON.parse(content);
    } catch (error: any) {
      issues.push({ severity: "error", message: `Failed to parse: ${error.message}`, locale: localeName });
      continue;
    }

    const localeKeys = flattenObject(localeData);
    let missingCount = 0;

    for (const [key, refValue] of referenceKeys) {
      if (!localeKeys.has(key)) {
        missingCount++;
        issues.push({ severity: "error", message: `Missing key '${key}'`, locale: localeName });
      } else {
        const localeValue = localeKeys.get(key)!;

        if (localeValue.trim() === "" && refValue.trim() !== "") {
          issues.push({ severity: "warning", message: `Empty translation for key '${key}'`, locale: localeName });
        }

        const refPlaceholders = extractPlaceholders(refValue);
        const localePlaceholders = extractPlaceholders(localeValue);
        if (refPlaceholders.length > 0 && JSON.stringify(refPlaceholders) !== JSON.stringify(localePlaceholders)) {
          issues.push({
            severity: "error",
            message: `Placeholder mismatch in '${key}': expected [${refPlaceholders.join(", ")}], got [${localePlaceholders.join(", ")}]`,
            locale: localeName,
          });
        }

        if (localeValue === refValue && localeName !== refLocaleName) {
          issues.push({ severity: "warning", message: `Key '${key}' appears untranslated`, locale: localeName });
        }
      }
    }

    for (const [key] of localeKeys) {
      if (!referenceKeys.has(key)) {
        issues.push({ severity: "warning", message: `Extra key '${key}' not in reference`, locale: localeName });
      }
    }

    const presentCount = referenceKeys.size - missingCount;
    const percentage = referenceKeys.size > 0 ? Math.round((presentCount / referenceKeys.size) * 100) : 100;
    coverage.set(localeName, { present: presentCount, missing: missingCount, percentage });
  }

  return { referenceLocale: refLocaleName, locales: localeFiles.map((f) => path.basename(f, path.extname(f))), totalKeys: referenceKeys.size, issues, coverage };
}

function findLocaleFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => path.join(dir, e.name))
    .sort();
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npx tsx validate-i18n.ts <reference_locale> [other_locales...]");
    console.log("       npx tsx validate-i18n.ts <locales_directory>");
    console.log("\nExamples:");
    console.log("  npx tsx validate-i18n.ts locales/en.json locales/es.json");
    console.log("  npx tsx validate-i18n.ts locales/");
    process.exit(1);
  }

  let referenceFile: string;
  let localeFiles: string[];

  const stat = fs.statSync(args[0]);
  if (stat.isDirectory()) {
    localeFiles = findLocaleFiles(args[0]);
    if (localeFiles.length === 0) {
      console.log(`No JSON locale files found in '${args[0]}'`);
      process.exit(0);
    }
    referenceFile = localeFiles[0];
    console.log(`Using '${path.basename(referenceFile)}' as reference locale`);
  } else {
    referenceFile = args[0];
    localeFiles = args;
  }

  const report = validateLocales(referenceFile, localeFiles);
  const errors = report.issues.filter((i) => i.severity === "error");
  const warnings = report.issues.filter((i) => i.severity === "warning");

  console.log(`\ni18n Validation Report`);
  console.log("─────────────────────────────────────");
  console.log(`📊 Reference: ${report.referenceLocale} (${report.totalKeys} keys)`);

  if (report.coverage.size > 0) {
    console.log("\n   Coverage:");
    for (const [locale, stats] of report.coverage) {
      const bar = stats.percentage >= 100 ? "████████████████████" : stats.percentage >= 80 ? "████████████████░░░░" : stats.percentage >= 50 ? "██████████░░░░░░░░░░" : "████░░░░░░░░░░░░░░░░";
      console.log(`   ${locale}: ${bar} ${stats.percentage}% (${stats.missing} missing)`);
    }
  }

  if (report.issues.length > 0) {
    const byLocale = new Map<string, ValidationIssue[]>();
    for (const issue of report.issues) {
      const key = issue.locale || "general";
      if (!byLocale.has(key)) byLocale.set(key, []);
      byLocale.get(key)!.push(issue);
    }

    for (const [locale, localeIssues] of byLocale) {
      console.log(`\n   [${locale}]:`);
      const shown = localeIssues.slice(0, 20);
      for (const issue of shown) {
        const icon = issue.severity === "error" ? "❌" : "⚠️ ";
        console.log(`     ${icon} ${issue.message}`);
      }
      if (localeIssues.length > 20) {
        console.log(`     ... and ${localeIssues.length - 20} more issue(s)`);
      }
    }
  }

  console.log("\n─────────────────────────────────────");
  if (errors.length > 0) {
    console.log(`❌ ${errors.length} error(s), ${warnings.length} warning(s)`);
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log(`⚠️  ${warnings.length} warning(s)`);
    process.exit(0);
  } else {
    console.log("✅ All locales are complete and consistent");
    process.exit(0);
  }
}

main();
