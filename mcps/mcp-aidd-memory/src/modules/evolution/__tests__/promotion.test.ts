import { describe, expect, it } from 'vitest';
import type { EvolutionCandidate, SessionState, SessionObservation } from '@aidd.md/mcp-shared';
import { now } from '@aidd.md/mcp-shared';
import { promoteCandidate } from '../promotion.js';

class PromotionBackendStub {
  readonly saved: EvolutionCandidate[] = [];

  constructor(
    private readonly matchingSessions: number,
    private readonly totalSessions = 25,
    private readonly existing: EvolutionCandidate[] = [],
  ) {}

  async listEvolutionCandidates(filter?: { title?: string }): Promise<EvolutionCandidate[]> {
    if (filter?.title) {
      return this.existing.filter((c) => c.title.includes(filter.title!));
    }
    return this.existing;
  }

  async saveEvolutionCandidate(candidate: EvolutionCandidate): Promise<void> {
    this.saved.push(candidate);
  }

  async listSessions(): Promise<Array<{ id: string }>> {
    return Array.from({ length: this.totalSessions }, (_, i) => ({ id: `s${i}` }));
  }

  async getSession(id: string): Promise<SessionState | null> {
    return {
      id,
      branch: 'main',
      startedAt: now(),
      aiProvider: { provider: 'openai', model: 'gpt', modelId: 'gpt-5', client: 'codex' },
      decisions: [],
      errorsResolved: [],
      filesModified: [],
      tasksCompleted: [],
      tasksPending: [],
      agentsUsed: [],
      skillsUsed: [],
      toolsCalled: [],
      rulesApplied: [],
      workflowsFollowed: [],
      tkbEntriesConsulted: [],
      taskClassification: { domain: 'backend', nature: 'impl', complexity: 'low' },
      outcome: { testsPassing: true, complianceScore: 80, reverts: 0, reworks: 0 },
    };
  }

  async listObservations(filter?: { sessionId?: string }): Promise<SessionObservation[]> {
    const idx = Number((filter?.sessionId ?? 's0').replace('s', ''));
    const narrative = idx < this.matchingSessions
      ? 'This contains noisy-pattern token in a long narrative '.repeat(4)
      : 'This is a clean session narrative with no target pattern present '.repeat(4);
    return [{
      id: `o-${filter?.sessionId ?? 's0'}`,
      sessionId: filter?.sessionId ?? 's0',
      type: 'insight',
      title: 'obs',
      narrative,
      createdAt: now(),
    }];
  }
}

function makeCandidate(title: string, confidence = 92): EvolutionCandidate {
  return {
    id: 'cand-1',
    type: 'model_pattern_ban',
    title,
    description: 'desc',
    confidence,
    sessionCount: 10,
    evidence: [],
    discoveryTokensTotal: 0,
    suggestedAction: 'ban pattern',
    createdAt: now(),
    updatedAt: now(),
  };
}

function makeConventionCandidate(title: string, confidence = 80): EvolutionCandidate {
  return {
    id: 'conv-1',
    type: 'new_convention',
    title,
    description: 'desc',
    confidence,
    sessionCount: 8,
    evidence: [],
    discoveryTokensTotal: 0,
    suggestedAction: 'add convention',
    createdAt: now(),
    updatedAt: now(),
  };
}

describe('promoteCandidate shadow gating', () => {
  it('rejects new model_pattern_ban candidate when false positive rate is high', async () => {
    const backend = new PromotionBackendStub(5, 25);
    const result = await promoteCandidate({
      backend: backend as never,
      candidate: makeCandidate('Ban "noisy-pattern" for gpt-5'),
      thresholds: { autoApplyThreshold: 90, draftThreshold: 70 },
    });

    expect(result.action).toBe('rejected');
    expect(backend.saved).toHaveLength(0);
    expect(result.candidate?.shadowTested).toBe(true);
    expect((result.candidate?.falsePositiveRate ?? 0)).toBeGreaterThan(0.1);
  });

  it('rejects existing candidate updates through the same shadow gate', async () => {
    const existing = makeCandidate('Frequent pattern: "noisy-pattern" (filler)', 65);
    const backend = new PromotionBackendStub(4, 25, [existing]);
    const incoming = makeCandidate('Frequent pattern: "noisy-pattern" (filler)', 95);
    const result = await promoteCandidate({
      backend: backend as never,
      candidate: incoming,
      thresholds: { autoApplyThreshold: 90, draftThreshold: 70 },
    });

    expect(result.action).toBe('rejected');
    expect(result.mergedExisting).toBe(true);
    expect(backend.saved).toHaveLength(0);
  });

  it('applies shadow metadata and promotes when false positive rate is low', async () => {
    const backend = new PromotionBackendStub(1, 25);
    const result = await promoteCandidate({
      backend: backend as never,
      candidate: makeCandidate('Ban "noisy-pattern" for gpt-5', 95),
      thresholds: { autoApplyThreshold: 90, draftThreshold: 70 },
    });

    expect(result.action).toBe('auto_applied');
    expect(backend.saved).toHaveLength(1);
    expect(backend.saved[0]?.shadowTested).toBe(true);
    expect(backend.saved[0]?.sampleSize).toBeGreaterThanOrEqual(20);
  });

  it('rejects new_convention candidates when overlap with good sessions is too high', async () => {
    const backend = new PromotionBackendStub(8, 25);
    const result = await promoteCandidate({
      backend: backend as never,
      candidate: makeConventionCandidate('Recurring error: noisy pattern token'),
      thresholds: { autoApplyThreshold: 90, draftThreshold: 70 },
    });

    expect(result.action).toBe('rejected');
    expect(backend.saved).toHaveLength(0);
    expect(result.candidate?.shadowTested).toBe(true);
    expect((result.candidate?.falsePositiveRate ?? 0)).toBeGreaterThan(0.1);
  });

  it('promotes new_convention candidates when overlap with good sessions is low', async () => {
    const backend = new PromotionBackendStub(1, 25);
    const result = await promoteCandidate({
      backend: backend as never,
      candidate: makeConventionCandidate('Recurring error: noisy pattern token', 75),
      thresholds: { autoApplyThreshold: 90, draftThreshold: 70 },
    });

    expect(result.action).toBe('drafted');
    expect(backend.saved).toHaveLength(1);
    expect(backend.saved[0]?.shadowTested).toBe(true);
  });
});
