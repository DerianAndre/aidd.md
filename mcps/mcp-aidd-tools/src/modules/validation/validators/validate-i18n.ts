import type { ValidationResult, ValidationIssue } from '../types.js';

/**
 * Validates i18n locale JSON files for structure and consistency.
 * Checks: valid JSON, empty values, placeholder format, key naming,
 * nested structure, HTML in translations.
 */
export function validateI18n(content: string, filePath?: string): ValidationResult {
  const issues: ValidationIssue[] = [];

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(content);
  } catch {
    return {
      valid: false,
      issues: [{ severity: 'error', message: 'Failed to parse content as JSON.', file: filePath }],
      summary: 'Parse error: content is not valid JSON.',
    };
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      valid: false,
      issues: [{ severity: 'error', message: 'Root must be a JSON object, not array or primitive.', file: filePath }],
      summary: 'Invalid i18n structure.',
    };
  }

  // Flatten nested keys
  const flatKeys = new Map<string, string>();
  function flatten(obj: Record<string, unknown>, prefix = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (/\s/.test(key)) {
        issues.push({ severity: 'warning', message: `Key '${fullKey}' contains spaces. Use camelCase or dot.notation.`, file: filePath });
      }
      if (/^[A-Z][A-Z_]+$/.test(key) && key.length > 2) {
        issues.push({ severity: 'info', message: `Key '${fullKey}' uses UPPER_CASE. Consider camelCase for consistency.`, file: filePath });
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        flatten(value as Record<string, unknown>, fullKey);
      } else {
        const strValue = String(value ?? '');
        flatKeys.set(fullKey, strValue);

        if (strValue.trim() === '') {
          issues.push({ severity: 'warning', message: `Empty value for key '${fullKey}'.`, file: filePath });
        }

        if (/<\/?[a-z][\s\S]*>/i.test(strValue)) {
          issues.push({ severity: 'warning', message: `Key '${fullKey}' contains HTML markup. Consider using a safe interpolation method.`, file: filePath });
        }

        // Mixed placeholder formats
        const doubleBrace = (strValue.match(/\{\{\w+\}\}/g) ?? []).length;
        const singleBrace = (strValue.match(/\{(\w+)\}/g) ?? []).length;
        const percentBrace = (strValue.match(/%\{\w+\}/g) ?? []).length;
        const formatSpec = (strValue.match(/%[sd]/g) ?? []).length;
        const formatTypes = [doubleBrace > 0, singleBrace > 0, percentBrace > 0, formatSpec > 0].filter(Boolean).length;
        if (formatTypes > 1) {
          issues.push({ severity: 'warning', message: `Key '${fullKey}' mixes placeholder formats. Use a single style consistently.`, file: filePath });
        }
      }
    }
  }

  flatten(data);

  const totalKeys = flatKeys.size;
  const emptyKeys = [...flatKeys.values()].filter((v) => v.trim() === '').length;

  if (totalKeys === 0) {
    issues.push({ severity: 'warning', message: 'Locale file has no translation keys.', file: filePath });
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const valid = errors === 0;
  const summary = valid
    ? `${totalKeys} key(s) validated${emptyKeys > 0 ? `, ${emptyKeys} empty` : ''}.`
    : `${errors} error(s) found in i18n file.`;

  return { valid, issues, summary };
}
