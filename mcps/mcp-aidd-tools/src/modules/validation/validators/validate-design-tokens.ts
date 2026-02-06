import type { ValidationResult, ValidationIssue } from '../types.js';

const EXPECTED_CATEGORIES = ['color', 'spacing', 'font', 'radius', 'shadow', 'breakpoint', 'z-index', 'transition'];
const KEBAB_CASE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function isValidColor(color: string): boolean {
  if (/^#[0-9a-f]{6}$/i.test(color)) return true;
  if (/^#[0-9a-f]{3}$/i.test(color)) return true;
  if (/^rgb\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(color)) return true;
  if (/^rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/.test(color)) return true;
  if (/^oklch\s*\(/.test(color)) return true;
  if (/^hsl\s*\(/.test(color)) return true;
  return false;
}

/**
 * Validates design token files (JSON or CSS custom properties).
 * Checks: naming conventions, color format validity, completeness,
 * duplicate variables, spacing grid alignment.
 */
export function validateDesignTokens(content: string, filePath?: string): ValidationResult {
  const issues: ValidationIssue[] = [];

  const trimmed = content.trimStart();
  const isJSON = trimmed.startsWith('{') || trimmed.startsWith('[');

  if (isJSON) {
    return validateJSONTokens(content, issues, filePath);
  }
  return validateCSSTokens(content, issues, filePath);
}

function validateJSONTokens(content: string, issues: ValidationIssue[], filePath?: string): ValidationResult {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(content);
  } catch {
    return {
      valid: false,
      issues: [{ severity: 'error', message: 'Failed to parse content as JSON.', file: filePath }],
      summary: 'Parse error.',
    };
  }

  const categories = new Map<string, number>();
  let tokenCount = 0;

  function walkTokens(obj: Record<string, unknown>, prefix = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (!KEBAB_CASE.test(key) && !key.startsWith('$')) {
        issues.push({ severity: 'warning', message: `Token key '${fullKey}' is not kebab-case.`, file: filePath });
      }

      if (typeof value === 'object' && value !== null && !(value as Record<string, unknown>).$value) {
        walkTokens(value as Record<string, unknown>, fullKey);
      } else {
        tokenCount++;
        const category = prefix ? prefix.split('.')[0]! : key.split('-')[0]!;
        categories.set(category, (categories.get(category) ?? 0) + 1);

        const tokenValue = typeof value === 'object'
          ? String((value as Record<string, unknown>).$value ?? (value as Record<string, unknown>).value ?? '')
          : String(value);

        if ((fullKey.includes('color') || tokenValue.startsWith('#')) && tokenValue.startsWith('#')) {
          if (!isValidColor(tokenValue)) {
            issues.push({ severity: 'error', message: `Invalid color value '${tokenValue}' for token '${fullKey}'.`, file: filePath });
          }
        }
      }
    }
  }

  walkTokens(data);

  for (const expected of EXPECTED_CATEGORIES) {
    if (![...categories.keys()].some((k) => k.includes(expected) || expected.includes(k))) {
      issues.push({ severity: 'info', message: `Missing token category: '${expected}'.`, file: filePath });
    }
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const valid = errors === 0;
  return {
    valid,
    issues,
    summary: valid ? `${tokenCount} JSON token(s) validated.` : `${errors} error(s) found in design tokens.`,
  };
}

function validateCSSTokens(content: string, issues: ValidationIssue[], filePath?: string): ValidationResult {
  const lines = content.split('\n');
  const categories = new Map<string, number>();
  let tokenCount = 0;
  const varNames: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const varMatch = line.match(/--([a-z][a-z0-9-]*)\s*:\s*(.+?)\s*;/);

    if (varMatch) {
      tokenCount++;
      const varName = varMatch[1]!;
      const varValue = varMatch[2]!;
      const category = varName.split('-')[0]!;
      categories.set(category, (categories.get(category) ?? 0) + 1);

      if (category === 'spacing' && /^\d+px$/.test(varValue) && parseInt(varValue) % 4 !== 0) {
        issues.push({ severity: 'warning', message: `Spacing token '--${varName}: ${varValue}' is not on a 4px grid.`, file: filePath });
      }

      if (varNames.includes(varName)) {
        issues.push({ severity: 'error', message: `Duplicate CSS variable: '--${varName}'.`, file: filePath });
      }
      varNames.push(varName);
    }

    // Hardcoded colors not using tokens
    if (!line.includes('--') && !line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
      if (/:\s*#[0-9a-f]{3,8}\s*;/i.test(line)) {
        issues.push({ severity: 'warning', message: `Hardcoded color on line ${i + 1}. Use a CSS custom property instead.`, file: filePath });
      }
    }
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const valid = errors === 0;
  return {
    valid,
    issues,
    summary: valid ? `${tokenCount} CSS token(s) validated.` : `${errors} error(s) found in design tokens.`,
  };
}
