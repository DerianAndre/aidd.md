import { createHash } from 'node:crypto';
import type { ModelFingerprint, BannedPattern, AuditScore } from './types.js';
import type { PatternMatch } from './types.js';

// ---------------------------------------------------------------------------
// Built-in AI pattern signatures
// ---------------------------------------------------------------------------

export const AI_PATTERN_SIGNATURES: Array<{
  pattern: RegExp;
  category: string;
  label: string;
}> = [
  // Fillers
  { pattern: /\blet me\b/gi, category: 'filler', label: 'Let me' },
  { pattern: /\bcertainly\b/gi, category: 'filler', label: 'Certainly' },
  { pattern: /\bI'd be happy to\b/gi, category: 'filler', label: "I'd be happy to" },
  { pattern: /\babsolutely\b/gi, category: 'filler', label: 'Absolutely' },
  { pattern: /\bgreat question\b/gi, category: 'filler', label: 'Great question' },
  // Hedges
  { pattern: /\bit's worth noting\b/gi, category: 'hedge', label: "It's worth noting" },
  { pattern: /\bI should mention\b/gi, category: 'hedge', label: 'I should mention' },
  { pattern: /\bas an AI\b/gi, category: 'hedge', label: 'As an AI' },
  // Verbosity
  { pattern: /\bin order to\b/gi, category: 'verbosity', label: 'In order to' },
  { pattern: /\bit is important to note\b/gi, category: 'verbosity', label: 'Important to note' },
  { pattern: /\blet's dive into\b/gi, category: 'verbosity', label: "Let's dive into" },
  // Structure
  { pattern: /\bFirstly\b.*?\bSecondly\b.*?\b(?:Finally|Thirdly)\b/gis, category: 'structure', label: 'Triada' },
];

// ---------------------------------------------------------------------------
// Pattern detection
// ---------------------------------------------------------------------------

function extractContext(text: string, match: string, maxLen = 80): string {
  const idx = text.indexOf(match);
  if (idx < 0) return match;
  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, idx + match.length + 20);
  let ctx = text.slice(start, end).replace(/\n/g, ' ');
  if (ctx.length > maxLen) ctx = ctx.slice(0, maxLen) + '...';
  return ctx;
}

export function detectPatterns(
  text: string,
  bannedPatterns: BannedPattern[],
): PatternMatch[] {
  const matches: PatternMatch[] = [];

  // Check built-in signatures
  for (const sig of AI_PATTERN_SIGNATURES) {
    const re = new RegExp(sig.pattern.source, sig.pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      matches.push({
        label: sig.label,
        category: sig.category,
        matchedText: m[0],
        context: extractContext(text, m[0]),
      });
    }
  }

  // Check banned patterns from DB
  for (const bp of bannedPatterns) {
    if (!bp.active) continue;
    try {
      const re = bp.type === 'regex'
        ? new RegExp(bp.pattern, 'gi')
        : new RegExp(`\\b${bp.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        matches.push({
          patternId: bp.id,
          label: bp.pattern,
          category: bp.category,
          matchedText: m[0],
          context: extractContext(text, m[0]),
        });
      }
    } catch {
      // Skip invalid regex
    }
  }

  return matches;
}

// ---------------------------------------------------------------------------
// Statistical fingerprinting
// ---------------------------------------------------------------------------

const PASSIVE_RE = /\b(?:was|were|been|being|is|are)\s+\w+ed\b/gi;
const QUESTION_RE = /\?/g;

export function computeFingerprint(text: string): ModelFingerprint {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

  const sentLengths = sentences.map((s) => s.split(/\s+/).length);
  const avgSentLen = sentLengths.reduce((a, b) => a + b, 0) / Math.max(sentLengths.length, 1);
  const variance = sentLengths.reduce((sum, l) => sum + (l - avgSentLen) ** 2, 0) / Math.max(sentLengths.length, 1);

  const uniqueWords = new Set(words);
  const ttr = words.length > 0 ? uniqueWords.size / words.length : 0;

  const avgParaLen = paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0) / Math.max(paragraphs.length, 1);

  const passiveMatches = text.match(PASSIVE_RE) ?? [];
  const passiveRatio = sentences.length > 0 ? passiveMatches.length / sentences.length : 0;

  let fillerCount = 0;
  for (const sig of AI_PATTERN_SIGNATURES) {
    const m = text.match(new RegExp(sig.pattern.source, sig.pattern.flags));
    if (m) fillerCount += m.length;
  }
  const fillerDensity = words.length > 0 ? (fillerCount / words.length) * 1000 : 0;

  const questions = text.match(QUESTION_RE) ?? [];
  const questionFreq = words.length > 0 ? (questions.length / words.length) * 1000 : 0;

  return {
    avgSentenceLength: Math.round(avgSentLen * 100) / 100,
    sentenceLengthVariance: Math.round(variance * 100) / 100,
    typeTokenRatio: Math.round(ttr * 1000) / 1000,
    avgParagraphLength: Math.round(avgParaLen * 100) / 100,
    passiveVoiceRatio: Math.round(passiveRatio * 1000) / 1000,
    fillerDensity: Math.round(fillerDensity * 100) / 100,
    questionFrequency: Math.round(questionFreq * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Full audit scoring (5-dimension rubric)
// ---------------------------------------------------------------------------

export function computeAuditScore(
  text: string,
  bannedPatterns: BannedPattern[],
  modelId: string,
  sessionId?: string,
): AuditScore {
  const fingerprint = computeFingerprint(text);
  const matches = detectPatterns(text, bannedPatterns);

  // Dimension 1: Lexical diversity (0-20) — higher TTR = better
  const lexicalDiversity = Math.round(Math.min(20, fingerprint.typeTokenRatio * 40));

  // Dimension 2: Structural variation (0-20) — moderate variance = best
  const idealVariance = 30;
  const varianceDelta = Math.abs(fingerprint.sentenceLengthVariance - idealVariance);
  const structuralVariation = Math.round(Math.max(0, 20 - varianceDelta * 0.3));

  // Dimension 3: Voice authenticity (0-20) — low passive voice + low filler = better
  const passivePenalty = Math.min(10, fingerprint.passiveVoiceRatio * 40);
  const fillerPenalty = Math.min(10, fingerprint.fillerDensity * 0.5);
  const voiceAuthenticity = Math.round(Math.max(0, 20 - passivePenalty - fillerPenalty));

  // Dimension 4: Pattern absence (0-20) — fewer banned patterns = better
  const patternPenalty = Math.min(20, matches.length * 3);
  const patternAbsence = Math.round(20 - patternPenalty);

  // Dimension 5: Semantic preservation (0-20) — default to 15 (user rates)
  const semanticPreservation = 15;

  const totalScore = lexicalDiversity + structuralVariation + voiceAuthenticity + patternAbsence + semanticPreservation;
  const verdict: AuditScore['verdict'] = totalScore >= 70 ? 'pass' : totalScore >= 40 ? 'retry' : 'escalate';

  const inputHash = createHash('sha256').update(text.slice(0, 1000)).digest('hex').slice(0, 16);

  return {
    sessionId,
    modelId,
    inputHash,
    totalScore,
    dimensions: {
      lexicalDiversity,
      structuralVariation,
      voiceAuthenticity,
      patternAbsence,
      semanticPreservation,
    },
    patternsFound: matches.length,
    verdict,
    createdAt: new Date().toISOString(),
  };
}
