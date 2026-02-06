import type { ValidationResult, ValidationIssue } from '../types.js';

/**
 * Validates OpenAPI 3.0+ specification structure and governance.
 * Accepts JSON string content (YAML must be pre-converted).
 * Checks: root keys, operationId, path formats, response codes.
 */
export function validateOpenapi(content: string, filePath?: string): ValidationResult {
  const issues: ValidationIssue[] = [];

  let spec: Record<string, unknown>;
  try {
    spec = JSON.parse(content);
  } catch {
    return {
      valid: false,
      issues: [{ severity: 'error', message: 'Failed to parse content as JSON. Convert YAML to JSON first.', file: filePath }],
      summary: 'Parse error: content is not valid JSON.',
    };
  }

  // 1. Check root keys
  const requiredRoots = ['openapi', 'info', 'paths'];
  for (const key of requiredRoots) {
    if (!(key in spec)) {
      issues.push({ severity: 'error', message: `Missing root key: '${key}'.`, file: filePath });
    }
  }

  // 2. Check info block
  const info = spec.info as Record<string, unknown> | undefined;
  if (info) {
    if (!info.title) issues.push({ severity: 'error', message: "Missing 'info.title'.", file: filePath });
    if (!info.version) issues.push({ severity: 'error', message: "Missing 'info.version'.", file: filePath });
  }

  // 3. Check paths and operations
  const paths = spec.paths as Record<string, Record<string, unknown>> | undefined;
  if (paths) {
    const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'];

    for (const [pathName, methods] of Object.entries(paths)) {
      if (!pathName.startsWith('/')) {
        issues.push({ severity: 'error', message: `Path '${pathName}' must start with /.`, file: filePath });
      }

      // Verb anti-pattern
      if (/\/(get|post|create|update|delete|put|patch)/i.test(pathName)) {
        issues.push({ severity: 'warning', message: `Path '${pathName}' contains HTTP verb — use HTTP methods instead.`, file: filePath });
      }

      for (const [method, details] of Object.entries(methods)) {
        if (!httpMethods.includes(method.toLowerCase())) continue;

        const op = details as Record<string, unknown>;
        const methodUpper = method.toUpperCase();

        // operationId
        if (!op.operationId) {
          issues.push({ severity: 'error', message: `Missing 'operationId' in ${methodUpper} ${pathName} (required for SDK generation).`, file: filePath });
        } else {
          const opId = String(op.operationId);
          if (opId.includes(' ')) {
            issues.push({ severity: 'error', message: `Invalid 'operationId' in ${methodUpper} ${pathName}: '${opId}' contains spaces.`, file: filePath });
          }
          if (opId.length > 0 && opId[0] !== opId[0]!.toLowerCase()) {
            issues.push({ severity: 'warning', message: `Style: operationId '${opId}' should start with lowercase (camelCase).`, file: filePath });
          }
        }

        // summary
        if (!op.summary) {
          issues.push({ severity: 'warning', message: `Missing 'summary' in ${methodUpper} ${pathName}.`, file: filePath });
        }

        // responses
        if (!op.responses) {
          issues.push({ severity: 'error', message: `Missing 'responses' in ${methodUpper} ${pathName}.`, file: filePath });
        } else {
          const responses = op.responses as Record<string, unknown>;
          if (['post', 'put', 'patch'].includes(method.toLowerCase())) {
            if (!('200' in responses) && !('201' in responses)) {
              issues.push({ severity: 'warning', message: `No success response (200/201) in ${methodUpper} ${pathName}.`, file: filePath });
            }
          }
        }
      }
    }
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const valid = errors === 0;
  const summary = valid
    ? issues.length > 0
      ? `OpenAPI spec valid with ${issues.length} warning(s).`
      : 'OpenAPI specification is valid and follows governance rules.'
    : `${errors} error(s) found in OpenAPI spec.`;

  return { valid, issues, summary };
}
