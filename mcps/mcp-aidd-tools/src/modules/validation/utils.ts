import { readFileOrNull } from '@aidd.md/mcp-shared';
import type { ValidationResult, ValidatorInput } from './types.js';

/**
 * Resolve content from either inline string or file path.
 * Returns null if neither is provided or file doesn't exist.
 */
export async function resolveContent(input: ValidatorInput): Promise<string | null> {
  if (input.content) return input.content;
  if (input.filePath) return readFileOrNull(input.filePath);
  return null;
}

/** Format a ValidationResult as human-readable text for MCP tool response. */
export function formatResult(result: ValidationResult): string {
  const lines: string[] = [];
  const errors = result.issues.filter((i) => i.severity === 'error');
  const warnings = result.issues.filter((i) => i.severity === 'warning');
  const infos = result.issues.filter((i) => i.severity === 'info');

  if (result.issues.length === 0) {
    lines.push(result.summary);
    return lines.join('\n');
  }

  for (const issue of result.issues) {
    const prefix =
      issue.severity === 'error' ? '[ERROR]' :
      issue.severity === 'warning' ? '[WARN]' : '[INFO]';
    const location = issue.line ? ` (line ${issue.line})` : '';
    const file = issue.file ? ` ${issue.file}` : '';
    lines.push(`${prefix}${file}${location}: ${issue.message}`);
  }

  lines.push('');
  lines.push(`--- ${result.summary}`);
  if (errors.length > 0) lines.push(`Errors: ${errors.length}`);
  if (warnings.length > 0) lines.push(`Warnings: ${warnings.length}`);
  if (infos.length > 0) lines.push(`Info: ${infos.length}`);

  return lines.join('\n');
}
