import type { ValidationResult, ValidationIssue } from '../types.js';

const REQUIRED_FRONTMATTER = ['name', 'category', 'last_updated', 'maturity'];
const VALID_CATEGORIES = ['runtime', 'frontend', 'backend', 'data', 'testing', 'infrastructure', 'security', 'tooling', 'pattern'];
const VALID_MATURITY = ['stable', 'emerging', 'experimental', 'deprecated'];
const REQUIRED_SECTIONS = ['Overview', 'Key Metrics', 'Use Cases', 'Trade-offs', 'Alternatives', 'References'];

const VAGUE_TERMS = [
  { term: 'very fast', suggestion: "Use specific metric (e.g., '70k req/s')" },
  { term: 'high performance', suggestion: "Quantify (e.g., '40% faster than X')" },
  { term: 'lightweight', suggestion: "Quantify (e.g., '2MB bundle size')" },
  { term: 'easy to use', suggestion: 'Describe specific DX features' },
  { term: 'popular', suggestion: "Cite metrics (e.g., '50k GitHub stars')" },
];

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; bodyStart: number } | null {
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const frontmatter: Record<string, string> = {};
  for (const line of fmMatch[1]!.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      frontmatter[line.substring(0, colonIdx).trim()] = line.substring(colonIdx + 1).trim();
    }
  }
  return { frontmatter, bodyStart: fmMatch[0].length };
}

function extractH2Sections(content: string): string[] {
  const sections: string[] = [];
  const matches = content.matchAll(/^##\s+(.+)$/gm);
  for (const match of matches) {
    sections.push(match[1]!.replace(/[*_`]/g, '').replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim());
  }
  return sections;
}

export function validateTkbEntry(content: string, filePath?: string): ValidationResult {
  const issues: ValidationIssue[] = [];

  const parsed = parseFrontmatter(content);
  if (!parsed) {
    issues.push({ severity: 'error', message: 'Missing YAML frontmatter. Must start with --- and contain required fields.', file: filePath });
    return { valid: false, issues, summary: 'Invalid TKB entry: missing frontmatter.' };
  }

  const { frontmatter } = parsed;

  // Required fields
  for (const field of REQUIRED_FRONTMATTER) {
    if (!frontmatter[field]) {
      issues.push({ severity: 'error', message: `Missing required frontmatter field: '${field}'`, file: filePath });
    }
  }

  // Validate category
  if (frontmatter['category'] && !VALID_CATEGORIES.includes(frontmatter['category'])) {
    issues.push({ severity: 'error', message: `Invalid category '${frontmatter['category']}'. Must be one of: ${VALID_CATEGORIES.join(', ')}`, file: filePath });
  }

  // Validate maturity
  if (frontmatter['maturity'] && !VALID_MATURITY.includes(frontmatter['maturity'])) {
    issues.push({ severity: 'error', message: `Invalid maturity '${frontmatter['maturity']}'. Must be one of: ${VALID_MATURITY.join(', ')}`, file: filePath });
  }

  // Validate date
  const lastUpdated = frontmatter['last_updated'];
  if (lastUpdated) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lastUpdated)) {
      issues.push({ severity: 'error', message: `Invalid date format '${lastUpdated}'. Must be YYYY-MM-DD.`, file: filePath });
    } else {
      const entryDate = new Date(lastUpdated);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      if (entryDate < sixMonthsAgo) {
        issues.push({ severity: 'warning', message: `Entry last updated ${lastUpdated} (> 6 months ago). Consider reviewing.`, file: filePath });
      }
    }
  }

  // Required sections
  const sections = extractH2Sections(content);
  for (const required of REQUIRED_SECTIONS) {
    if (!sections.some((s) => s.toLowerCase().includes(required.toLowerCase()))) {
      issues.push({ severity: 'error', message: `Missing required section: '${required}'`, file: filePath });
    }
  }

  const body = content.substring(parsed.bodyStart);

  // Vague language
  for (const { term, suggestion } of VAGUE_TERMS) {
    if (body.toLowerCase().includes(term)) {
      issues.push({ severity: 'warning', message: `Vague language: '${term}'. ${suggestion}`, file: filePath });
    }
  }

  // Use case scores
  const useCaseSection = body.match(/## .*Use Cases[\s\S]*?(?=##|$)/i);
  if (useCaseSection && !/\b([1-9]|10)\s*\/\s*10\b/.test(useCaseSection[0])) {
    issues.push({ severity: 'warning', message: "Use Cases section has no numeric scores (e.g., '8/10').", file: filePath });
  }

  // References URLs
  const refsSection = body.match(/## .*References[\s\S]*?(?=##|$)/i);
  if (refsSection && !/https?:\/\//.test(refsSection[0])) {
    issues.push({ severity: 'warning', message: 'References section has no URLs. Cite sources.', file: filePath });
  }

  // Alternatives table
  const altSection = body.match(/## .*Alternatives[\s\S]*?(?=##|$)/i);
  if (altSection && !/\|.*\|/.test(altSection[0])) {
    issues.push({ severity: 'warning', message: 'Alternatives section has no comparison table.', file: filePath });
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const valid = errors === 0;
  const name = frontmatter['name'] ?? 'unknown';
  const summary = valid
    ? `TKB entry '${name}' is valid.`
    : `TKB entry '${name}' has ${errors} error(s).`;

  return { valid, issues, summary };
}
