import type { ValidationResult, ValidationIssue } from '../types.js';

interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: 'error' | 'warning';
}

const SECRET_PATTERNS: SecretPattern[] = [
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'error' },
  { name: 'Generic API Key', pattern: /(api_key|apikey|api-key|secret|token|password|passwd|pwd)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi, severity: 'error' },
  { name: 'RSA Private Key', pattern: /-----BEGIN (RSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g, severity: 'error' },
  { name: 'Slack Token', pattern: /xox[baprs]-[0-9a-zA-Z\-]{10,48}/g, severity: 'error' },
  { name: 'Stripe API Key', pattern: /sk_(live|test)_[0-9a-zA-Z]{24,}/g, severity: 'error' },
  { name: 'Google API Key', pattern: /AIza[0-9A-Za-z\\-_]{35}/g, severity: 'error' },
  { name: 'GitHub Token', pattern: /gh[pousr]_[A-Za-z0-9_]{36,255}/g, severity: 'error' },
  { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, severity: 'warning' },
  { name: 'PostgreSQL Connection String', pattern: /postgres(ql)?:\/\/[^:]+:[^@]+@[^\/]+\/[^\s'"]+/gi, severity: 'error' },
  { name: 'MongoDB Connection String', pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^\s'"]+/gi, severity: 'error' },
];

export function scanSecrets(content: string, filePath?: string): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const patternDef of SECRET_PATTERNS) {
    const matches = content.matchAll(patternDef.pattern);
    for (const match of matches) {
      let line: number | undefined;
      if (match.index !== undefined) {
        line = (content.substring(0, match.index).match(/\n/g) ?? []).length + 1;
      }
      const preview = match[0].length > 50 ? match[0].substring(0, 47) + '...' : match[0];
      issues.push({
        severity: patternDef.severity,
        message: `${patternDef.name}: ${preview}`,
        file: filePath,
        line,
      });
    }
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const valid = errors === 0;
  const summary = valid
    ? 'No hardcoded secrets detected.'
    : `${issues.length} potential secret(s) detected. Move to environment variables.`;

  return { valid, issues, summary };
}
