import type { ValidationResult, ValidationIssue } from '../types.js';

interface A11yRule {
  id: string;
  severity: 'error' | 'warning';
  pattern: RegExp;
  message: string;
}

const RULES: A11yRule[] = [
  { id: 'img-alt', severity: 'error', pattern: /<img\b(?![^>]*\balt\s*=)/gi, message: "Image missing 'alt' attribute (WCAG 1.1.1)." },
  { id: 'img-alt-empty', severity: 'warning', pattern: /<img\b[^>]*\balt\s*=\s*["']\s*["']/gi, message: "Image has empty alt text. Use descriptive text or role='presentation'." },
  { id: 'button-content', severity: 'error', pattern: /<button\b[^>]*>\s*<\/button>/gi, message: 'Empty button element. Buttons must have text or aria-label (WCAG 4.1.2).' },
  { id: 'a-content', severity: 'error', pattern: /<a\b[^>]*>\s*<\/a>/gi, message: 'Empty anchor element. Links must have descriptive text (WCAG 2.4.4).' },
  { id: 'a-target-blank', severity: 'warning', pattern: /<a\b[^>]*target\s*=\s*["']_blank["'](?![^>]*rel\s*=\s*["'][^"']*noopener)/gi, message: "Link opens in new tab without rel='noopener'." },
  { id: 'input-label', severity: 'error', pattern: /<input\b(?![^>]*\b(aria-label|aria-labelledby|id)\s*=)(?![^>]*\btype\s*=\s*["'](hidden|submit|button|reset)["'])/gi, message: 'Input element missing label association (WCAG 1.3.1).' },
  { id: 'select-label', severity: 'error', pattern: /<select\b(?![^>]*\b(aria-label|aria-labelledby)\s*=)/gi, message: 'Select element missing aria-label or aria-labelledby (WCAG 1.3.1).' },
  { id: 'aria-hidden-focusable', severity: 'error', pattern: /aria-hidden\s*=\s*["']true["'][^>]*(?:tabIndex\s*=\s*["'][^-][^"']*["']|href\s*=)/gi, message: 'Element is aria-hidden but focusable (WCAG 4.1.2).' },
  { id: 'onclick-no-key', severity: 'warning', pattern: /\bonClick\s*=(?![^>]*\b(onKeyDown|onKeyUp|onKeyPress|role\s*=\s*["']button["'])\b)/gi, message: 'onClick without keyboard handler. Add onKeyDown or use a button (WCAG 2.1.1).' },
  { id: 'tabindex-positive', severity: 'warning', pattern: /tabIndex\s*=\s*\{?\s*["']?[1-9]\d*/gi, message: 'Positive tabIndex disrupts natural tab order. Use 0 or -1 only.' },
  { id: 'div-click', severity: 'warning', pattern: /<div\b[^>]*\bonClick\b(?![^>]*\brole\s*=)/gi, message: "Clickable div without role. Use button or add role='button'." },
  { id: 'span-click', severity: 'warning', pattern: /<span\b[^>]*\bonClick\b(?![^>]*\brole\s*=)/gi, message: "Clickable span without role. Use button or add role='button'." },
  { id: 'video-captions', severity: 'error', pattern: /<video\b(?![^>]*\b(track|captions))/gi, message: 'Video element without captions track (WCAG 1.2.2).' },
  { id: 'heading-empty', severity: 'error', pattern: /<h[1-6]\b[^>]*>\s*<\/h[1-6]>/gi, message: 'Empty heading element (WCAG 1.3.1).' },
  { id: 'autoplay', severity: 'warning', pattern: /\bautoPlay\b|\bautoplay\b/gi, message: 'autoplay detected. Provide pause controls (WCAG 1.4.2).' },
];

/**
 * Audits HTML/JSX/TSX content for accessibility violations.
 * Checks: alt text, ARIA labels, form labels, heading order,
 * keyboard navigation, focus management.
 */
export function auditAccessibility(content: string, filePath?: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (const rule of RULES) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(line)) {
        issues.push({ severity: rule.severity, message: `[${rule.id}] ${rule.message}`, file: filePath, line: i + 1 });
      }
    }
  }

  // Check heading order
  const headingLevels: number[] = [];
  for (const line of lines) {
    const match = line.match(/<h([1-6])\b/i);
    if (match) headingLevels.push(parseInt(match[1]!, 10));
  }
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i]! > headingLevels[i - 1]! + 1) {
      issues.push({
        severity: 'warning',
        message: `[heading-order] Heading level skipped: h${headingLevels[i - 1]!} to h${headingLevels[i]!} (WCAG 1.3.1).`,
        file: filePath,
      });
      break;
    }
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const valid = errors === 0;
  const summary = valid
    ? issues.length > 0
      ? `${issues.length} accessibility warning(s).`
      : 'No accessibility issues detected.'
    : `${errors} accessibility error(s) found.`;

  return { valid, issues, summary };
}
