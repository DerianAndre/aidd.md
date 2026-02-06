import type { ValidationResult, ValidationIssue } from '../types.js';

/**
 * Validates Mermaid C4 diagram syntax.
 * Checks: balanced braces/parens, C4 directive, Rel() arguments, duplicate aliases.
 */
export function validateMermaid(content: string, filePath?: string): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Check 1: Balanced braces and parentheses
  const openBraces = (content.match(/{/g) ?? []).length;
  const closeBraces = (content.match(/}/g) ?? []).length;
  if (openBraces !== closeBraces) {
    issues.push({
      severity: 'error',
      message: `Unbalanced curly braces: ${openBraces} open vs ${closeBraces} close. Check Boundary definitions.`,
      file: filePath,
    });
  }

  const openParens = (content.match(/\(/g) ?? []).length;
  const closeParens = (content.match(/\)/g) ?? []).length;
  if (openParens !== closeParens) {
    issues.push({
      severity: 'error',
      message: `Unbalanced parentheses: ${openParens} open vs ${closeParens} close. Check macro definitions.`,
      file: filePath,
    });
  }

  // Check 2: C4 diagram type declaration
  const hasC4Directive = /C4(Context|Container|Component|Dynamic|Deployment)/.test(content);
  if (!hasC4Directive) {
    issues.push({
      severity: 'error',
      message: 'Missing C4 diagram type declaration. Must start with C4Context, C4Container, C4Component, C4Dynamic, or C4Deployment.',
      file: filePath,
    });
  }

  if (/graph\s+(TD|LR|TB|BT)/.test(content)) {
    issues.push({
      severity: 'warning',
      message: "Found generic 'graph TD/LR' syntax. Use C4-specific directives instead.",
      file: filePath,
    });
  }

  // Check 3: Relationship syntax integrity
  const cleanContent = content.replace(/\n/g, ' ').replace(/\r/g, '');
  const relMatches = cleanContent.match(/Rel\s*\((.*?)\)/g) ?? [];

  for (let idx = 0; idx < relMatches.length; idx++) {
    const match = relMatches[idx];
    const argsString = match!.match(/Rel\s*\((.*?)\)/)?.[1] ?? '';
    const args = argsString.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((s) => s.trim());

    if (args.length < 3) {
      issues.push({
        severity: 'warning',
        message: `Relationship #${idx + 1} has fewer than 3 arguments: ${match}. Expected Rel(from, to, label).`,
        file: filePath,
      });
    }
  }

  // Check 4: Duplicate aliases
  const aliasPattern =
    /(?:Person|System|System_Ext|Container|ContainerDb|ContainerQueue|Component|ComponentDb)\s*\(\s*([a-zA-Z0-9_]+)/g;
  const aliases: string[] = [];
  const allAliasMatches = content.matchAll(aliasPattern);
  for (const m of allAliasMatches) {
    aliases.push(m[1]!);
  }

  const duplicates = [...new Set(aliases.filter((alias, index) => aliases.indexOf(alias) !== index))];
  if (duplicates.length > 0) {
    issues.push({
      severity: 'error',
      message: `Duplicate aliases found: ${duplicates.join(', ')}. All aliases must be unique.`,
      file: filePath,
    });
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const valid = errors === 0;
  const summary = valid
    ? issues.length > 0
      ? `Mermaid syntax valid with ${issues.length} warning(s).`
      : 'Mermaid C4 syntax is valid.'
    : `${errors} error(s) found in Mermaid diagram.`;

  return { valid, issues, summary };
}
