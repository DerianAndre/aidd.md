#!/usr/bin/env node
/**
 * Mermaid C4 Diagram Validator (TypeScript)
 *
 * Validates Mermaid.js C4 syntax to prevent rendering errors.
 *
 * Usage:
 *   npx tsx validate-mermaid.ts "C4Context..."
 *   npx tsx validate-mermaid.ts diagram.mmd
 */

import * as fs from "fs";
import * as path from "path";

interface ValidationResult {
  isValid: boolean;
  issues: string[];
}

function validateMermaid(content: string): ValidationResult {
  const issues: string[] = [];

  // Check 1: Balanced braces and parentheses
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push(
      "Error: Unbalanced curly braces '{}'. Check Boundary definitions."
    );
  }

  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push(
      "Error: Unbalanced parentheses '()'. Check macro definitions like System() or Rel()."
    );
  }

  // Check 2: C4 Diagram Type Declaration
  const hasC4Directive =
    /C4(Context|Container|Component|Dynamic|Deployment)/.test(content);
  if (!hasC4Directive) {
    issues.push(
      "Error: Missing C4 diagram type declaration. Must start with C4Context, C4Container, C4Component, C4Dynamic, or C4Deployment."
    );
  }

  if (/graph\s+(TD|LR|TB|BT)/.test(content)) {
    issues.push(
      "Warning: Found generic 'graph TD/LR' syntax. Use C4-specific directives instead."
    );
  }

  // Check 3: Relationship Syntax Integrity
  const cleanContent = content.replace(/\n/g, " ").replace(/\r/g, "");
  const relMatches = cleanContent.match(/Rel\s*\((.*?)\)/g) || [];

  relMatches.forEach((match, idx) => {
    const argsString = match.match(/Rel\s*\((.*?)\)/)?.[1] || "";
    // Split by commas, respecting quoted strings
    const args = argsString
      .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
      .map((s) => s.trim());

    if (args.length < 3) {
      issues.push(
        `Warning: Relationship #${
          idx + 1
        } has fewer than 3 arguments: ${match}. Expected Rel(from, to, label) or Rel(from, to, label, tech).`
      );
    }
  });

  // Check 4: Duplicate Aliases
  const aliasPattern =
    /(?:Person|System|System_Ext|Container|ContainerDb|ContainerQueue|Component|ComponentDb)\s*\(\s*([a-zA-Z0-9_]+)/g;
  const aliases: string[] = [];
  let aliasMatch;

  while ((aliasMatch = aliasPattern.exec(content)) !== null) {
    aliases.push(aliasMatch[1]);
  }

  const duplicates = aliases.filter(
    (alias, index) => aliases.indexOf(alias) !== index
  );
  const uniqueDuplicates = [...new Set(duplicates)];

  if (uniqueDuplicates.length > 0) {
    issues.push(
      `Error: Duplicate aliases found: ${uniqueDuplicates.join(
        ", "
      )}. All aliases must be unique.`
    );
  }

  const isValid = !issues.some((issue) => issue.startsWith("Error"));
  return { isValid, issues };
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npx tsx validate-mermaid.ts <mermaid_code_or_file>");
    console.log("\nExamples:");
    console.log('  npx tsx validate-mermaid.ts "C4Context..."');
    console.log("  npx tsx validate-mermaid.ts diagram.mmd");
    process.exit(1);
  }

  const input = args[0];
  let content: string;

  // Check if input is a file
  if (input.endsWith(".mmd") || input.endsWith(".md")) {
    try {
      content = fs.readFileSync(input, "utf-8");
    } catch (error) {
      console.error(`❌ Error: File not found: ${input}`);
      process.exit(1);
    }
  } else {
    content = input;
  }

  const { isValid, issues } = validateMermaid(content);

  if (!isValid) {
    console.log("❌ Validation Failed:");
    issues.forEach((issue) => console.log(`  ${issue}`));
    process.exit(1);
  } else if (issues.length > 0) {
    console.log("⚠️  Validation Passed with Warnings:");
    issues.forEach((issue) => console.log(`  ${issue}`));
    process.exit(0);
  } else {
    console.log("✅ Validation Successful: Mermaid syntax appears valid.");
    process.exit(0);
  }
}

main();
