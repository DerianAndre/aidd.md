import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date input as relative time (e.g., "2h ago"). */
export function formatRelativeTime(dateInput: string | number): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/** Capitalize first letter. */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Truncate string to max length with ellipsis. */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '\u2026';
}

/** Normalize Windows backslashes to forward slashes. */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/** Extract filename without extension from a path. */
export function filenameFromPath(path: string): string {
  const normalized = normalizePath(path);
  const name = normalized.split('/').pop() ?? '';
  const dotIdx = name.lastIndexOf('.');
  return dotIdx > 0 ? name.slice(0, dotIdx) : name;
}

/** Format milliseconds as a human-readable duration (e.g., "1h 23m"). */
export function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s';
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  if (hr > 0) return `${hr}h ${min % 60}m`;
  if (min > 0) return `${min}m`;
  return `${sec}s`;
}

/** Format a date input as a short date (e.g., "Feb 5, 2026"). */
export function formatDate(dateInput: string | number): string {
  return new Date(dateInput).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Map a 0-100 score to a semantic color. */
export function scoreColor(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 70) return 'success';
  if (score >= 40) return 'warning';
  return 'danger';
}

/** Calculate TID (Token Information Density) ratio from token usage. */
export function calculateTidRatio(tokenUsage?: { inputTokens: number; outputTokens: number }): string {
  if (!tokenUsage || tokenUsage.inputTokens === 0) return '—';
  const ratio = tokenUsage.outputTokens / tokenUsage.inputTokens;
  return `${ratio.toFixed(1)}x`;
}

/** Format large token counts with K suffix. */
export function formatTokenCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

/** Get Tailwind color class for compliance score. */
export function getComplianceColor(score: number): string {
  if (score >= 70) return 'text-teal-500';
  if (score >= 40) return 'text-yellow-500';
  return 'text-red-500';
}

/** Map artifacts to AIDD phases for phase stepper visualization. */
export function mapArtifactsToPhases(artifacts: Array<{ type: string }>): Record<string, boolean> {
  return {
    understand: artifacts.some(a => ['brainstorm', 'research'].includes(a.type)),
    plan: artifacts.some(a => a.type === 'plan'),
    spec: artifacts.some(a => ['spec', 'adr'].includes(a.type)),
    build: artifacts.some(a => a.type === 'issue'),
    verify: artifacts.some(a => a.type === 'checklist'),
    ship: artifacts.some(a => a.type === 'retro'),
  };
}
