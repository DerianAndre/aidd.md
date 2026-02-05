import type { MistakeEntry } from '../memory/permanent-memory.js';

// ---------------------------------------------------------------------------
// Text similarity (same tokenize pattern as json-backend.ts)
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'and', 'but', 'or', 'not', 'this', 'that', 'it', 'i', 'me', 'my',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function scoreMatch(queryTokens: string[], targetTokens: string[]): number {
  if (queryTokens.length === 0 || targetTokens.length === 0) return 0;
  const targetSet = new Set(targetTokens);
  const matches = queryTokens.filter((t) => targetSet.has(t)).length;
  return matches / Math.max(queryTokens.length, 1);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ScoredMistake extends MistakeEntry {
  similarity: number;
}

export function findSimilarErrors(
  query: string,
  mistakes: MistakeEntry[],
  threshold = 0.3,
): ScoredMistake[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const results: ScoredMistake[] = [];

  for (const m of mistakes) {
    const targetTokens = tokenize(
      [m.error, m.rootCause, m.fix, m.prevention].join(' '),
    );
    const similarity = scoreMatch(queryTokens, targetTokens);
    if (similarity >= threshold) {
      results.push({ ...m, similarity: Math.round(similarity * 100) / 100 });
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results;
}
