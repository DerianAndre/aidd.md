import type { ValidationResult, ValidationIssue } from '../types.js';

/**
 * Validates SQL DDL/DML syntax using static regex analysis.
 * Checks: DDL structure, anti-patterns (SELECT *), missing constraints,
 * unbalanced parentheses, dangerous operations without WHERE.
 * NOTE: Pure regex — no heavy deps (no SQLite runtime validation).
 */
export function validateSql(content: string, filePath?: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const lines = content.split('\n');

  const statements = content
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  if (statements.length === 0) {
    return { valid: true, issues: [], summary: 'No SQL statements found.' };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    const lineNum = i + 1;
    if (line.startsWith('--') || line === '') continue;

    // Anti-pattern: SELECT *
    if (/\bSELECT\s+\*/i.test(line)) {
      issues.push({ severity: 'warning', message: 'SELECT * detected. Specify explicit columns for production queries.', file: filePath, line: lineNum });
    }

    // Missing WHERE in UPDATE/DELETE
    if (/\bUPDATE\b/i.test(line) && !/\bWHERE\b/i.test(line)) {
      const nextLines = lines.slice(i, Math.min(i + 5, lines.length)).join(' ');
      if (!/\bWHERE\b/i.test(nextLines)) {
        issues.push({ severity: 'error', message: 'UPDATE without WHERE clause. This will modify all rows.', file: filePath, line: lineNum });
      }
    }
    if (/\bDELETE\s+FROM\b/i.test(line) && !/\bWHERE\b/i.test(line)) {
      const nextLines = lines.slice(i, Math.min(i + 5, lines.length)).join(' ');
      if (!/\bWHERE\b/i.test(nextLines)) {
        issues.push({ severity: 'error', message: 'DELETE without WHERE clause. This will delete all rows.', file: filePath, line: lineNum });
      }
    }

    // DROP TABLE without IF EXISTS
    if (/\bDROP\s+TABLE\b/i.test(line) && !/\bIF\s+EXISTS\b/i.test(line)) {
      issues.push({ severity: 'warning', message: 'DROP TABLE without IF EXISTS. Use DROP TABLE IF EXISTS for safety.', file: filePath, line: lineNum });
    }
  }

  // Statement-level checks
  for (const stmt of statements) {
    const upper = stmt.toUpperCase();

    // CREATE TABLE checks
    if (upper.startsWith('CREATE TABLE')) {
      if (!upper.includes('PRIMARY KEY')) {
        issues.push({ severity: 'warning', message: `CREATE TABLE missing PRIMARY KEY: ${stmt.substring(0, 60)}...`, file: filePath });
      }

      if (/REFERENCES\s+\w+/i.test(stmt) && !upper.includes('INDEX') && !upper.includes('CREATE INDEX')) {
        issues.push({ severity: 'info', message: 'Table has foreign keys. Consider adding indexes on FK columns.', file: filePath });
      }
    }

    // Unbalanced parentheses
    const opens = (stmt.match(/\(/g) ?? []).length;
    const closes = (stmt.match(/\)/g) ?? []).length;
    if (opens !== closes) {
      const preview = stmt.substring(0, 80);
      issues.push({ severity: 'error', message: `Unbalanced parentheses in statement: ${preview}...`, file: filePath });
    }
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const valid = errors === 0;
  const summary = valid
    ? issues.length > 0
      ? `SQL valid with ${issues.length} suggestion(s).`
      : `${statements.length} SQL statement(s) validated — no issues found.`
    : `${errors} error(s) found in SQL.`;

  return { valid, issues, summary };
}
