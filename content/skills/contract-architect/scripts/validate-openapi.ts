#!/usr/bin/env node
/**
 * OpenAPI Specification Validator (TypeScript)
 *
 * Validates OpenAPI 3.0+ specifications for structure and governance.
 *
 * Usage:
 *   npx tsx validate-openapi.ts spec.yaml
 */

import * as fs from "fs";
import * as yaml from "yaml";

interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
}

function validateOpenAPIStructure(spec: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Check Root Keys
  const requiredRoots = ["openapi", "info", "paths"];
  for (const key of requiredRoots) {
    if (!(key in spec)) {
      issues.push({ severity: "error", message: `Missing root key: '${key}'` });
    }
  }

  // 2. Check Info Block
  if (spec.info) {
    if (!spec.info.title) {
      issues.push({ severity: "error", message: "Missing 'info.title'" });
    }
    if (!spec.info.version) {
      issues.push({ severity: "error", message: "Missing 'info.version'" });
    }
  }

  // 3. Check Paths and Operation IDs
  if (spec.paths) {
    for (const [pathName, methods] of Object.entries<any>(spec.paths)) {
      // Validate path format
      if (!pathName.startsWith("/")) {
        issues.push({
          severity: "error",
          message: `Path '${pathName}' must start with /`,
        });
      }

      // Check for verbs in path (anti-pattern)
      const verbPattern = /\/(get|post|create|update|delete|put|patch)/i;
      if (verbPattern.test(pathName)) {
        issues.push({
          severity: "warning",
          message: `Path '${pathName}' contains HTTP verb - use HTTP methods instead`,
        });
      }

      // Iterate through HTTP methods
      const httpMethods = [
        "get",
        "post",
        "put",
        "delete",
        "patch",
        "options",
        "head",
        "trace",
      ];

      for (const [method, details] of Object.entries<any>(methods)) {
        if (!httpMethods.includes(method.toLowerCase())) {
          continue; // Skip $ref or summary at path level
        }

        const methodUpper = method.toUpperCase();

        // CRITICAL: Check for operationId
        if (!details.operationId) {
          issues.push({
            severity: "error",
            message: `CRITICAL: Missing 'operationId' in ${methodUpper} ${pathName} (required for SDK generation)`,
          });
        } else {
          const opId = details.operationId;

          // Check operationId format
          if (opId.includes(" ")) {
            issues.push({
              severity: "error",
              message: `Invalid 'operationId' in ${methodUpper} ${pathName}: '${opId}' contains spaces`,
            });
          }

          // Check camelCase (should start with lowercase)
          if (opId && opId[0] !== opId[0].toLowerCase()) {
            issues.push({
              severity: "warning",
              message: `Style: 'operationId' '${opId}' should start with lowercase (camelCase)`,
            });
          }
        }

        // Check for summary
        if (!details.summary) {
          issues.push({
            severity: "warning",
            message: `Missing 'summary' in ${methodUpper} ${pathName}`,
          });
        }

        // Check for responses
        if (!details.responses) {
          issues.push({
            severity: "error",
            message: `Missing 'responses' in ${methodUpper} ${pathName}`,
          });
        } else {
          // Check for common status codes
          const responses = details.responses;
          if (["post", "put", "patch"].includes(method.toLowerCase())) {
            if (!("200" in responses) && !("201" in responses)) {
              issues.push({
                severity: "warning",
                message: `No success response (200/201) in ${methodUpper} ${pathName}`,
              });
            }
          }
        }
      }
    }
  }

  return issues;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npx tsx validate-openapi.ts <spec_file.yaml>");
    console.log(
      "\nValidates OpenAPI 3.0+ specifications for correctness and governance."
    );
    process.exit(1);
  }

  const filepath = args[0];

  try {
    const fileContent = fs.readFileSync(filepath, "utf-8");
    const spec = yaml.parse(fileContent);

    if (typeof spec !== "object" || spec === null) {
      console.error("❌ Invalid YAML: Expected an object at root level");
      process.exit(1);
    }

    const issues = validateOpenAPIStructure(spec);

    if (issues.length > 0) {
      const errors = issues.filter((i) => i.severity === "error");
      const warnings = issues.filter((i) => i.severity === "warning");

      console.log(`OpenAPI Validation Failed (${issues.length} issues):\n`);

      issues.forEach((issue) => {
        const icon = issue.severity === "error" ? "❌" : "⚠️ ";
        console.log(`  ${icon} ${issue.message}`);
      });

      if (errors.length > 0) {
        console.log(`\n💥 ${errors.length} critical error(s) must be fixed!`);
        process.exit(1);
      } else {
        console.log(
          "\n⚠️  Warnings only - spec is functional but could be improved."
        );
        process.exit(0);
      }
    } else {
      console.log("✅ OpenAPI Spec is valid and follows governance rules!");
      process.exit(0);
    }
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.error(`❌ Error: File not found: ${filepath}`);
    } else if (error.name === "YAMLParseError") {
      console.error(`❌ YAML Parsing Error: ${error.message}`);
    } else {
      console.error(`❌ Unexpected error: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
