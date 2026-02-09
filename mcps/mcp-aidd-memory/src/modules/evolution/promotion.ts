import { now } from '@aidd.md/mcp-shared';
import type { EvolutionCandidate, StorageBackend } from '@aidd.md/mcp-shared';
import { shadowTestPattern } from './analyzer.js';

export type PromotionAction = 'auto_applied' | 'drafted' | 'pending' | 'rejected' | 'skipped';

export interface PromotionThresholds {
  autoApplyThreshold: number;
  draftThreshold: number;
}

export interface PromoteCandidateInput {
  backend: StorageBackend;
  candidate: EvolutionCandidate;
  thresholds: PromotionThresholds;
  rejectedTitles?: Set<string>;
}

export interface PromoteCandidateResult {
  action: PromotionAction;
  candidate?: EvolutionCandidate;
  reason?: string;
  mergedExisting: boolean;
}

const PATTERN_TITLE_REGEXES = [
  /^Ban "(.+?)" for /i,
  /^Frequent pattern: "(.+?)"/i,
];

function mergeCandidate(existing: EvolutionCandidate, incoming: EvolutionCandidate): EvolutionCandidate {
  const modelEvidence = { ...(existing.modelEvidence ?? {}), ...(incoming.modelEvidence ?? {}) };
  for (const [modelId, count] of Object.entries(existing.modelEvidence ?? {})) {
    modelEvidence[modelId] = Math.max(modelEvidence[modelId] ?? 0, count);
  }
  for (const [modelId, count] of Object.entries(incoming.modelEvidence ?? {})) {
    modelEvidence[modelId] = Math.max(modelEvidence[modelId] ?? 0, count);
  }

  return {
    ...existing,
    description: incoming.description || existing.description,
    confidence: Math.max(existing.confidence, incoming.confidence),
    sessionCount: Math.max(existing.sessionCount, incoming.sessionCount),
    evidence: [...new Set([...existing.evidence, ...incoming.evidence])],
    discoveryTokensTotal: Math.max(existing.discoveryTokensTotal, incoming.discoveryTokensTotal),
    suggestedAction: incoming.suggestedAction || existing.suggestedAction,
    modelScope: incoming.modelScope ?? existing.modelScope,
    modelEvidence: Object.keys(modelEvidence).length > 0 ? modelEvidence : undefined,
    updatedAt: now(),
  };
}

function classifyAction(confidence: number, thresholds: PromotionThresholds): Exclude<PromotionAction, 'rejected' | 'skipped'> {
  if (confidence >= thresholds.autoApplyThreshold) return 'auto_applied';
  if (confidence >= thresholds.draftThreshold) return 'drafted';
  return 'pending';
}

function extractPatternText(title: string): string | null {
  for (const re of PATTERN_TITLE_REGEXES) {
    const match = title.match(re);
    if (match?.[1]) return match[1];
  }
  return null;
}

export async function promoteCandidate(input: PromoteCandidateInput): Promise<PromoteCandidateResult> {
  const { backend, candidate, thresholds, rejectedTitles } = input;
  const existing = (await backend.listEvolutionCandidates({ title: candidate.title }))
    .find((c) => c.title === candidate.title);

  if (candidate.type === 'model_pattern_ban' && rejectedTitles?.has(candidate.title)) {
    return {
      action: 'skipped',
      reason: 'recent_rejection_cooldown',
      candidate: existing ?? candidate,
      mergedExisting: !!existing,
    };
  }

  let working = existing ? mergeCandidate(existing, candidate) : {
    ...candidate,
    updatedAt: now(),
  };

  if (working.type === 'model_pattern_ban') {
    const patternText = extractPatternText(working.title);
    if (!patternText) {
      return {
        action: 'rejected',
        reason: 'unparseable_pattern_title',
        candidate: working,
        mergedExisting: !!existing,
      };
    }

    const shadow = await shadowTestPattern(patternText, backend);
    working = {
      ...working,
      shadowTested: true,
      falsePositiveRate: shadow.falsePositiveRate,
      sampleSize: shadow.sampleSize,
      testedAt: now(),
    };

    if (!shadow.passed) {
      return {
        action: 'rejected',
        reason: `false_positive_rate=${shadow.falsePositiveRate}`,
        candidate: working,
        mergedExisting: !!existing,
      };
    }
  }

  await backend.saveEvolutionCandidate(working);
  return {
    action: classifyAction(working.confidence, thresholds),
    candidate: working,
    mergedExisting: !!existing,
  };
}

