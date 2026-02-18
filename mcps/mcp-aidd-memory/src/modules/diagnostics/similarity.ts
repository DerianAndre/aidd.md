import type { MistakeEntry } from '../memory/permanent-memory.js';
import type { ErrorCategory, ErrorCategorization, StackFrame, StackTraceInfo } from './types.js';

// ---------------------------------------------------------------------------
// Tokenization
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

// ---------------------------------------------------------------------------
// Bigrams
// ---------------------------------------------------------------------------

function generateBigrams(tokens: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return bigrams;
}

// ---------------------------------------------------------------------------
// TF-IDF
// ---------------------------------------------------------------------------

function computeIdf(corpus: string[][]): Map<string, number> {
  const docCount = corpus.length;
  const docFreq = new Map<string, number>();
  for (const doc of corpus) {
    const unique = new Set(doc);
    for (const token of unique) {
      docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [token, freq] of docFreq) {
    idf.set(token, Math.log((docCount + 1) / (freq + 1)) + 1);
  }
  return idf;
}

function computeTfIdfWeights(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  const weights = new Map<string, number>();
  for (const [token, count] of tf) {
    const idfVal = idf.get(token) ?? 1;
    weights.set(token, (count / tokens.length) * idfVal);
  }
  return weights;
}

// ---------------------------------------------------------------------------
// Fuzzy matching (Levenshtein)
// ---------------------------------------------------------------------------

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0]![j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }
  return matrix[a.length]![b.length]!;
}

function fuzzyMatchScore(queryTokens: string[], targetTokens: string[]): number {
  if (queryTokens.length === 0 || targetTokens.length === 0) return 0;
  let matches = 0;
  for (const qt of queryTokens) {
    for (const tt of targetTokens) {
      if (qt === tt) {
        matches++;
        break;
      }
      // Only fuzzy-match tokens longer than 3 chars to avoid false positives
      if (qt.length > 3 && tt.length > 3 && levenshteinDistance(qt, tt) <= 2) {
        matches++;
        break;
      }
    }
  }
  return matches / Math.max(queryTokens.length, 1);
}

// ---------------------------------------------------------------------------
// Combined weighted scorer
// ---------------------------------------------------------------------------

function computeWeightedScore(
  queryTokens: string[],
  targetTokens: string[],
  idf: Map<string, number>,
): number {
  if (queryTokens.length === 0 || targetTokens.length === 0) return 0;

  // 1. Unigram overlap (TF-IDF weighted)
  const queryWeights = computeTfIdfWeights(queryTokens, idf);
  const targetSet = new Set(targetTokens);
  let weightedHits = 0;
  let totalWeight = 0;
  for (const [token, weight] of queryWeights) {
    totalWeight += weight;
    if (targetSet.has(token)) weightedHits += weight;
  }
  const unigramScore = totalWeight > 0 ? weightedHits / totalWeight : 0;

  // 2. Bigram overlap
  const queryBigrams = generateBigrams(queryTokens);
  const targetBigrams = new Set(generateBigrams(targetTokens));
  const bigramHits = queryBigrams.filter((b) => targetBigrams.has(b)).length;
  const bigramScore = queryBigrams.length > 0 ? bigramHits / queryBigrams.length : 0;

  // 3. Fuzzy matching
  const fuzzy = fuzzyMatchScore(queryTokens, targetTokens);

  // Combined: unigram 0.4 + bigram 0.3 + fuzzy 0.3
  return unigramScore * 0.4 + bigramScore * 0.3 + fuzzy * 0.3;
}

// ---------------------------------------------------------------------------
// Public API — similarity search
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

  // Build corpus for IDF from all mistakes + query
  const corpus = mistakes.map((m) =>
    tokenize([m.error, m.rootCause, m.fix, m.prevention].join(' ')),
  );
  corpus.push(queryTokens);
  const idf = computeIdf(corpus);

  const results: ScoredMistake[] = [];

  for (const m of mistakes) {
    const targetTokens = tokenize(
      [m.error, m.rootCause, m.fix, m.prevention].join(' '),
    );
    const similarity = computeWeightedScore(queryTokens, targetTokens, idf);
    if (similarity >= threshold) {
      results.push({ ...m, similarity: Math.round(similarity * 100) / 100 });
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results;
}

// ---------------------------------------------------------------------------
// Error categorization
// ---------------------------------------------------------------------------

interface CategoryPattern {
  category: ErrorCategory;
  patterns: RegExp[];
  suggestion: string;
}

const CATEGORY_PATTERNS: CategoryPattern[] = [
  {
    category: 'type',
    patterns: [
      /\bTS2\d{3}\b/i,
      /type\s+'[^']+'\s+is\s+not\s+assignable/i,
      /property\s+'[^']+'\s+does\s+not\s+exist/i,
      /cannot\s+find\s+name/i,
      /type\s+error/i,
      /argument\s+of\s+type/i,
    ],
    suggestion: 'Check TypeScript types and interfaces. Verify import paths and type assertions.',
  },
  {
    category: 'build',
    patterns: [
      /cannot\s+find\s+module/i,
      /syntaxerror/i,
      /unexpected\s+token/i,
      /failed\s+to\s+compile/i,
      /module\s+not\s+found/i,
      /build\s+failed/i,
      /parse\s+error/i,
      /esbuild.*error/i,
    ],
    suggestion: 'Check import paths, module resolution, and build configuration.',
  },
  {
    category: 'runtime',
    patterns: [
      /typeerror(?!.*ts2)/i,
      /referenceerror/i,
      /cannot\s+read\s+propert/i,
      /is\s+not\s+a\s+function/i,
      /is\s+not\s+defined/i,
      /rangeerror/i,
      /stack\s+overflow/i,
      /undefined\s+is\s+not/i,
    ],
    suggestion: 'Check runtime values, null guards, and function signatures.',
  },
  {
    category: 'config',
    patterns: [
      /enoent/i,
      /missing\s+required/i,
      /invalid\s+configuration/i,
      /configuration\s+error/i,
      /env\s+var/i,
      /environment\s+variable/i,
      /config\s+file/i,
    ],
    suggestion: 'Verify config files, environment variables, and file paths.',
  },
  {
    category: 'dependency',
    patterns: [
      /peer\s+dep/i,
      /eresolve/i,
      /version\s+mismatch/i,
      /could\s+not\s+resolve/i,
      /incompatible\s+version/i,
      /missing\s+peer/i,
      /npm\s+err/i,
      /pnpm.*error/i,
    ],
    suggestion: 'Check package versions and peer dependency requirements. Try clean install.',
  },
  {
    category: 'network',
    patterns: [
      /econnrefused/i,
      /timeout/i,
      /fetch\s+failed/i,
      /network\s+error/i,
      /status\s+[45]\d{2}/i,
      /econnreset/i,
      /enotfound/i,
      /socket\s+hang\s+up/i,
    ],
    suggestion: 'Check network connectivity, API endpoints, and timeout settings.',
  },
  {
    category: 'test',
    patterns: [
      /assertionerror/i,
      /expect\(/i,
      /test\s+failed/i,
      /test\s+suite\s+failed/i,
      /assertion\s+failed/i,
      /vitest.*fail/i,
      /jest.*fail/i,
    ],
    suggestion: 'Review test expectations and mock data. Check for flaky async tests.',
  },
];

export function categorizeError(error: string): ErrorCategorization {
  let bestMatch: CategoryPattern | null = null;
  let bestMatchCount = 0;

  for (const cp of CATEGORY_PATTERNS) {
    const matchCount = cp.patterns.filter((p) => p.test(error)).length;
    if (matchCount > bestMatchCount) {
      bestMatchCount = matchCount;
      bestMatch = cp;
    }
  }

  if (bestMatch && bestMatchCount > 0) {
    const confidence = Math.min(0.9, 0.3 + bestMatchCount * 0.2);
    return {
      category: bestMatch.category,
      confidence: Math.round(confidence * 100) / 100,
      suggestion: bestMatch.suggestion,
    };
  }

  return {
    category: 'unknown',
    confidence: 0,
    suggestion: 'Check the error message for specific details. Search project memory for similar issues.',
  };
}

// ---------------------------------------------------------------------------
// Stack trace parsing
// ---------------------------------------------------------------------------

const STACK_FRAME_RE = /(?:at\s+)?(?:(.+?)\s+\()?([^\s()]+):(\d+)(?::(\d+))?\)?/;
const NODE_MODULES_RE = /node_modules/;

export function parseStackTrace(error: string): StackTraceInfo | null {
  const lines = error.split('\n');
  const frames: StackFrame[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Stack frames typically start with "at " or contain file:line patterns
    if (!trimmed.startsWith('at ') && !/\w+\.[jt]sx?:\d+/.test(trimmed)) continue;

    const match = trimmed.match(STACK_FRAME_RE);
    if (!match) continue;

    const [, functionName, file, lineStr, colStr] = match;
    if (!file || !lineStr) continue;
    // Skip internal Node.js frames
    if (file.startsWith('node:') || file.startsWith('internal/')) continue;

    const lineNum = Number.parseInt(lineStr, 10);
    if (!Number.isFinite(lineNum)) continue;

    frames.push({
      file,
      line: lineNum,
      column: colStr ? Number.parseInt(colStr, 10) : undefined,
      functionName: functionName?.trim() || undefined,
    });
  }

  if (frames.length === 0) return null;

  // Primary file = first non-node_modules frame
  const primaryFrame = frames.find((f) => !NODE_MODULES_RE.test(f.file));
  const primaryFile = primaryFrame?.file;

  // Extract module name from primary file path
  let primaryModule: string | undefined;
  if (primaryFile) {
    const parts = primaryFile.replace(/\\/g, '/').split('/');
    primaryModule = parts.length > 1 ? parts[parts.length - 2] : undefined;
  }

  return { frames, primaryFile, primaryModule };
}
