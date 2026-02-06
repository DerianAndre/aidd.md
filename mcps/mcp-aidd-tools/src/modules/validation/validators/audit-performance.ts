import type { ValidationResult, ValidationIssue } from '../types.js';

interface PerfRule {
  id: string;
  category: string;
  severity: 'error' | 'warning' | 'info';
  pattern: RegExp;
  message: string;
  fileFilter?: RegExp;
}

const RULES: PerfRule[] = [
  // Bundle size
  { id: 'barrel-import', category: 'Bundle Size', severity: 'warning', pattern: /import\s+\{[^}]+\}\s+from\s+['"]lodash['"]/g, message: "Barrel import from lodash. Use 'lodash/function' for tree-shaking (saves ~70KB)." },
  { id: 'moment-import', category: 'Bundle Size', severity: 'warning', pattern: /import\s+.*\s+from\s+['"]moment['"]/g, message: 'moment.js imported (330KB). Use date-fns or dayjs instead.' },
  { id: 'dynamic-import-missing', category: 'Bundle Size', severity: 'info', pattern: /import\s+.*\s+from\s+['"](chart\.js|three|@monaco-editor|ace-builds|codemirror|leaflet|mapbox-gl|pdf-lib|xlsx|exceljs)['"]/g, message: 'Heavy library imported statically. Consider dynamic import() for code splitting.' },
  // React re-renders
  { id: 'inline-object-prop', category: 'Re-renders', severity: 'warning', pattern: /\bstyle\s*=\s*\{\s*\{/g, message: 'Inline style object creates new reference on every render. Extract to const or useMemo.', fileFilter: /\.(tsx|jsx)$/ },
  { id: 'inline-function-prop', category: 'Re-renders', severity: 'info', pattern: /\bon\w+\s*=\s*\{\s*\(\s*\)\s*=>/g, message: 'Inline arrow function as prop. Consider useCallback for expensive child components.', fileFilter: /\.(tsx|jsx)$/ },
  { id: 'useeffect-no-deps', category: 'Re-renders', severity: 'warning', pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*\)\s*;/g, message: 'useEffect without dependency array runs on every render.' },
  { id: 'state-in-loop', category: 'Re-renders', severity: 'error', pattern: /\bfor\s*\(.*\)\s*\{[^}]*\bset[A-Z]\w*\s*\(/g, message: 'setState called inside a loop. Batch state updates or use useReducer.', fileFilter: /\.(tsx|jsx)$/ },
  // Memory leaks
  { id: 'event-listener-no-cleanup', category: 'Memory', severity: 'warning', pattern: /addEventListener\s*\([^)]+\)(?![\s\S]*?removeEventListener)/g, message: 'addEventListener without corresponding removeEventListener. Potential memory leak.' },
  { id: 'setinterval-no-clear', category: 'Memory', severity: 'warning', pattern: /setInterval\s*\(/g, message: 'setInterval detected. Ensure clearInterval is called on cleanup.' },
  // Inefficient patterns
  { id: 'nested-loop', category: 'Algorithm', severity: 'info', pattern: /\bfor\s*\([^)]+\)\s*\{[^}]*\bfor\s*\([^)]+\)/g, message: 'Nested loop detected (O(n\u00B2)). Consider Map/Set for O(n) lookups.' },
  { id: 'spread-in-reduce', category: 'Algorithm', severity: 'warning', pattern: /\.reduce\s*\([^)]*\.\.\./g, message: 'Spread operator inside reduce() creates O(n\u00B2) copies. Use mutation inside reduce.' },
  // DOM
  { id: 'layout-thrashing', category: 'DOM', severity: 'warning', pattern: /\b(offsetWidth|offsetHeight|clientWidth|clientHeight|scrollWidth|scrollHeight|getBoundingClientRect)\b/g, message: 'Layout property access detected. Batch reads/writes to prevent layout thrashing.' },
];

/**
 * Audits source code for common performance anti-patterns.
 * Checks: bundle size, re-render triggers, memory leaks,
 * inefficient patterns, DOM thrashing.
 */
export function auditPerformance(content: string, filePath?: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const lines = content.split('\n');

  for (const rule of RULES) {
    if (rule.fileFilter && filePath && !rule.fileFilter.test(filePath)) continue;

    for (let i = 0; i < lines.length; i++) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(lines[i]!)) {
        issues.push({
          severity: rule.severity,
          message: `[${rule.id}] ${rule.message}`,
          file: filePath,
          line: i + 1,
        });
      }
    }
  }

  // Large component check
  if (filePath && /\.(tsx|jsx)$/.test(filePath) && lines.length > 300) {
    issues.push({
      severity: 'info',
      message: `[large-component] Component file has ${lines.length} lines. Consider splitting.`,
      file: filePath,
    });
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const valid = errors === 0;
  const summary = valid
    ? issues.length > 0
      ? `${warnings} performance warning(s), ${issues.length - warnings - errors} suggestion(s).`
      : 'No performance anti-patterns detected.'
    : `${errors} performance error(s) found.`;

  return { valid, issues, summary };
}
