#!/usr/bin/env node
/**
 * SQL DDL Validator (TypeScript)
 *
 * Validates SQL syntax using better-sqlite3 in-memory database.
 * Sanitizes PostgreSQL/MySQL syntax for SQLite compatibility.
 *
 * Usage:
 *   npx tsx validate-sql.ts "CREATE TABLE users (...)"
 *   npx tsx validate-sql.ts schema.sql
 */

import * as fs from "fs";
import Database from "better-sqlite3";

function sanitizeSQL(sqlText: string): string {
  let sanitized = sqlText;

  // PostgreSQL → SQLite type mappings
  const replacements: Array<[RegExp, string]> = [
    [/\bUUID\b/gi, "TEXT"],
    [/\bSERIAL\b/gi, "INTEGER"],
    [/\bBIGSERIAL\b/gi, "INTEGER"],
    [/\bgen_random_uuid\(\)/gi, "'00000000-0000-0000-0000-000000000000'"],
    [/\bTIMESTAMP WITH TIME ZONE\b/gi, "DATETIME"],
    [/\bTIMESTAMP\b/gi, "DATETIME"],
    [/\bJSONB\b/gi, "TEXT"],
    [/\bJSON\b/gi, "TEXT"],
    [/\bDECIMAL\(/gi, "NUMERIC("],
    [/\bVARCHAR\(/gi, "TEXT("],
    [/\bAUTO_INCREMENT\b/gi, ""],
    [/ON UPDATE (CURRENT_TIMESTAMP|CASCADE|RESTRICT|SET NULL)/gi, ""],
  ];

  for (const [pattern, replacement] of replacements) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
}

interface ValidationResult {
  isValid: boolean;
  message: string;
}

function validateSQL(sqlText: string): ValidationResult {
  const sanitized = sanitizeSQL(sqlText);
  const db = new Database(":memory:");

  try {
    // Split by semicolon to handle multiple statements
    const statements = sanitized
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (let idx = 0; idx < statements.length; idx++) {
      const stmt = statements[idx];
      try {
        db.exec(stmt);
      } catch (error: any) {
        const preview = stmt.substring(0, 200);
        return {
          isValid: false,
          message: `Statement #${idx + 1} failed: ${
            error.message
          }\n\nStatement:\n${preview}...`,
        };
      }
    }

    db.close();
    return {
      isValid: true,
      message: "✅ SQL syntax appears valid (checked against SQLite grammar)",
    };
  } catch (error: any) {
    db.close();
    return {
      isValid: false,
      message: `❌ SQL Syntax Error: ${error.message}`,
    };
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npx tsx validate-sql.ts <sql_string_or_file>");
    console.log("\nExamples:");
    console.log(
      '  npx tsx validate-sql.ts "CREATE TABLE users (id SERIAL PRIMARY KEY);"'
    );
    console.log("  npx tsx validate-sql.ts schema.sql");
    process.exit(1);
  }

  const input = args[0];
  let sqlText: string;

  // Check if input is a file
  if (input.endsWith(".sql") || input.endsWith(".ddl")) {
    try {
      sqlText = fs.readFileSync(input, "utf-8");
    } catch (error) {
      console.error(`❌ Error: File not found: ${input}`);
      process.exit(1);
    }
  } else {
    sqlText = input;
  }

  const { isValid, message } = validateSQL(sqlText);

  console.log(message);

  if (!isValid) {
    console.log("\n💡 Note: This validator uses SQLite for syntax checking.");
    console.log(
      "   Dialect-specific features (UUID, JSONB, etc.) are automatically converted."
    );
    console.log(
      "   Always test your DDL in the target database before deploying!"
    );
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
