import { generateId, now } from '@aidd.md/mcp-shared';
import type { SessionState, AiddConfig, PatternStats } from '@aidd.md/mcp-shared';
import type { EvolutionCandidate } from './types.js';

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

function textSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = new Set(tokenize(b));
  if (tokensA.length === 0 || tokensB.size === 0) return 0;
  const matches = tokensA.filter((t) => tokensB.has(t)).length;
  return matches / Math.max(tokensA.length, tokensB.size);
}

// ---------------------------------------------------------------------------
// Pattern detectors
// ---------------------------------------------------------------------------

function detectModelRecommendations(
  sessions: SessionState[],
  minSessions: number,
): EvolutionCandidate[] {
  const candidates: EvolutionCandidate[] = [];

  // Group by domain → modelId
  const byDomain = new Map<string, Map<string, SessionState[]>>();

  for (const s of sessions) {
    if (!s.outcome) continue;
    const domain = s.taskClassification?.domain ?? 'unknown';
    if (!byDomain.has(domain)) byDomain.set(domain, new Map());
    const modelMap = byDomain.get(domain)!;
    const modelId = s.aiProvider.modelId;
    const list = modelMap.get(modelId) ?? [];
    list.push(s);
    modelMap.set(modelId, list);
  }

  for (const [domain, modelMap] of byDomain) {
    const modelScores: Array<{ modelId: string; score: number; count: number; ids: string[] }> = [];

    for (const [modelId, group] of modelMap) {
      if (group.length < minSessions) continue;
      let total = 0;
      for (const s of group) {
        total += s.outcome!.complianceScore;
      }
      modelScores.push({
        modelId,
        score: total / group.length,
        count: group.length,
        ids: group.map((s) => s.id),
      });
    }

    if (modelScores.length < 2) continue;
    modelScores.sort((a, b) => b.score - a.score);

    const best = modelScores[0]!;
    const second = modelScores[1]!;
    const improvement = (best.score - second.score) / Math.max(second.score, 1);

    if (improvement >= 0.2) {
      const confidence = Math.min(100, Math.round(best.count * 8 + improvement * 40));
      candidates.push({
        id: generateId(),
        type: 'model_recommendation',
        title: `Model ${best.modelId} outperforms for ${domain} tasks`,
        description: `${best.modelId} averages ${Math.round(best.score)} compliance vs ${second.modelId} at ${Math.round(second.score)} (${Math.round(improvement * 100)}% better) across ${best.count} sessions.`,
        confidence,
        sessionCount: best.count,
        evidence: best.ids,
        discoveryTokensTotal: 0,
        suggestedAction: `Update model recommendations: prefer ${best.modelId} for ${domain} tasks`,
        createdAt: now(),
        updatedAt: now(),
      });
    }
  }

  return candidates;
}

function detectRecurringMistakes(
  sessions: SessionState[],
  minOccurrences: number,
): EvolutionCandidate[] {
  const candidates: EvolutionCandidate[] = [];

  // Collect all errors across sessions
  const errorGroups: Array<{ error: string; sessionIds: string[] }> = [];

  for (const s of sessions) {
    for (const err of s.errorsResolved) {
      let found = false;
      for (const group of errorGroups) {
        if (textSimilarity(err.error, group.error) > 0.5) {
          group.sessionIds.push(s.id);
          found = true;
          break;
        }
      }
      if (!found) {
        errorGroups.push({ error: err.error, sessionIds: [s.id] });
      }
    }
  }

  for (const group of errorGroups) {
    const uniqueSessions = [...new Set(group.sessionIds)];
    if (uniqueSessions.length < minOccurrences) continue;

    const confidence = Math.min(100, Math.round(uniqueSessions.length * 15));
    candidates.push({
      id: generateId(),
      type: 'new_convention',
      title: `Recurring error: ${group.error.slice(0, 80)}`,
      description: `Error appears across ${uniqueSessions.length} sessions. Consider creating a convention or rule to prevent it.`,
      confidence,
      sessionCount: uniqueSessions.length,
      evidence: uniqueSessions,
      discoveryTokensTotal: 0,
      suggestedAction: `Draft convention or rule to prevent: "${group.error.slice(0, 80)}"`,
      createdAt: now(),
      updatedAt: now(),
    });
  }

  return candidates;
}

function detectToolSequences(
  sessions: SessionState[],
  minSessions: number,
): EvolutionCandidate[] {
  const candidates: EvolutionCandidate[] = [];

  // Find tool pairs that always appear together
  const pairCounts = new Map<string, { count: number; sessionIds: string[] }>();

  for (const s of sessions) {
    const toolNames = s.toolsCalled.map((t) => t.name);
    const uniqueTools = [...new Set(toolNames)];

    for (let i = 0; i < uniqueTools.length; i++) {
      for (let j = i + 1; j < uniqueTools.length; j++) {
        const key = [uniqueTools[i], uniqueTools[j]].sort().join(' + ');
        const entry = pairCounts.get(key) ?? { count: 0, sessionIds: [] };
        entry.count++;
        entry.sessionIds.push(s.id);
        pairCounts.set(key, entry);
      }
    }
  }

  for (const [pair, data] of pairCounts) {
    if (data.count < minSessions) continue;
    const uniqueSessions = [...new Set(data.sessionIds)];
    const confidence = Math.min(100, Math.round(uniqueSessions.length * 10));

    candidates.push({
      id: generateId(),
      type: 'compound_workflow',
      title: `Tools frequently used together: ${pair}`,
      description: `Tools ${pair} appear together in ${uniqueSessions.length} sessions. Consider creating a compound workflow.`,
      confidence,
      sessionCount: uniqueSessions.length,
      evidence: uniqueSessions,
      discoveryTokensTotal: 0,
      suggestedAction: `Create compound workflow combining: ${pair}`,
      createdAt: now(),
      updatedAt: now(),
    });
  }

  return candidates;
}

function detectSkillCombos(
  sessions: SessionState[],
  minSessions: number,
): EvolutionCandidate[] {
  const candidates: EvolutionCandidate[] = [];

  // Find agent combos correlated with higher compliance
  const comboCounts = new Map<string, { total: number; compliance: number; sessionIds: string[] }>();

  for (const s of sessions) {
    if (!s.outcome) continue;
    const agents = [...new Set(s.agentsUsed)].sort();
    if (agents.length < 2) continue;
    const key = agents.join(' + ');
    const entry = comboCounts.get(key) ?? { total: 0, compliance: 0, sessionIds: [] };
    entry.total++;
    entry.compliance += s.outcome.complianceScore;
    entry.sessionIds.push(s.id);
    comboCounts.set(key, entry);
  }

  // Compare combos with average
  let globalTotal = 0;
  let globalCompliance = 0;
  for (const s of sessions) {
    if (!s.outcome) continue;
    globalTotal++;
    globalCompliance += s.outcome.complianceScore;
  }
  const avgCompliance = globalTotal > 0 ? globalCompliance / globalTotal : 0;

  for (const [combo, data] of comboCounts) {
    if (data.total < minSessions) continue;
    const comboAvg = data.compliance / data.total;
    const improvement = avgCompliance > 0 ? (comboAvg - avgCompliance) / avgCompliance : 0;
    if (improvement < 0.1) continue;

    const uniqueSessions = [...new Set(data.sessionIds)];
    const confidence = Math.min(100, Math.round(uniqueSessions.length * 8 + improvement * 50));

    candidates.push({
      id: generateId(),
      type: 'skill_combo',
      title: `Agent combo ${combo} improves outcomes`,
      description: `Using ${combo} together averages ${Math.round(comboAvg)} compliance vs ${Math.round(avgCompliance)} overall (${Math.round(improvement * 100)}% better).`,
      confidence,
      sessionCount: uniqueSessions.length,
      evidence: uniqueSessions,
      discoveryTokensTotal: 0,
      suggestedAction: `Update routing to prefer ${combo} combination`,
      createdAt: now(),
      updatedAt: now(),
    });
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// New detectors (Phase 6)
// ---------------------------------------------------------------------------

function detectContextEfficiency(
  sessions: SessionState[],
  minSessions: number,
): EvolutionCandidate[] {
  const candidates: EvolutionCandidate[] = [];

  // Group by (domain, complexity) → modelId → token stats
  const groups = new Map<string, Map<string, { outputTokens: number; tasks: number; count: number; ids: string[] }>>();

  for (const s of sessions) {
    if (!s.tokenUsage || !s.outcome || s.tasksCompleted.length === 0) continue;
    const key = `${s.taskClassification?.domain ?? 'unknown'}:${s.taskClassification?.complexity ?? 'unknown'}`;
    if (!groups.has(key)) groups.set(key, new Map());
    const modelMap = groups.get(key)!;
    const modelId = s.aiProvider.modelId;
    const entry = modelMap.get(modelId) ?? { outputTokens: 0, tasks: 0, count: 0, ids: [] };
    entry.outputTokens += s.tokenUsage.outputTokens;
    entry.tasks += s.tasksCompleted.length;
    entry.count++;
    entry.ids.push(s.id);
    modelMap.set(modelId, entry);
  }

  for (const [taskKey, modelMap] of groups) {
    const models = [...modelMap.entries()]
      .filter(([, d]) => d.count >= minSessions && d.tasks > 0)
      .map(([modelId, d]) => ({
        modelId,
        tokensPerTask: d.outputTokens / d.tasks,
        count: d.count,
        ids: d.ids,
      }));

    if (models.length < 2) continue;
    models.sort((a, b) => a.tokensPerTask - b.tokensPerTask);

    const best = models[0]!;
    const worst = models[models.length - 1]!;
    const ratio = worst.tokensPerTask / Math.max(best.tokensPerTask, 1);

    if (ratio >= 2) {
      const confidence = Math.min(100, Math.round(best.count * 8 + ratio * 10));
      candidates.push({
        id: generateId(),
        type: 'context_efficiency',
        title: `${best.modelId} is ${Math.round(ratio)}x more token-efficient for ${taskKey}`,
        description: `${best.modelId}: ${Math.round(best.tokensPerTask)} tokens/task vs ${worst.modelId}: ${Math.round(worst.tokensPerTask)} tokens/task`,
        confidence,
        sessionCount: best.count + worst.count,
        evidence: [...best.ids.slice(0, 3), ...worst.ids.slice(0, 3)],
        discoveryTokensTotal: 0,
        suggestedAction: `Prefer ${best.modelId} for ${taskKey} tasks to reduce token usage`,
        createdAt: now(),
        updatedAt: now(),
      });
    }
  }

  return candidates;
}

function detectModelDrift(
  sessions: SessionState[],
  windowSize: number,
): EvolutionCandidate[] {
  const candidates: EvolutionCandidate[] = [];

  // Group sessions by modelId, sorted by start time
  const byModel = new Map<string, SessionState[]>();
  for (const s of sessions) {
    if (!s.outcome) continue;
    const list = byModel.get(s.aiProvider.modelId) ?? [];
    list.push(s);
    byModel.set(s.aiProvider.modelId, list);
  }

  for (const [modelId, group] of byModel) {
    if (group.length < windowSize * 2) continue;

    // Sort by startedAt
    group.sort((a, b) => a.startedAt.localeCompare(b.startedAt));

    const firstWindow = group.slice(0, windowSize);
    const lastWindow = group.slice(-windowSize);

    const firstAvg = firstWindow.reduce((sum, s) => sum + s.outcome!.complianceScore, 0) / windowSize;
    const lastAvg = lastWindow.reduce((sum, s) => sum + s.outcome!.complianceScore, 0) / windowSize;

    const drift = ((lastAvg - firstAvg) / Math.max(firstAvg, 1)) * 100;

    if (Math.abs(drift) >= 15) {
      const direction = drift > 0 ? 'improving' : 'degrading';
      const confidence = Math.min(100, Math.round(Math.abs(drift) * 1.5));
      candidates.push({
        id: generateId(),
        type: 'model_recommendation',
        title: `Model ${modelId} is ${direction} (${drift > 0 ? '+' : ''}${Math.round(drift)}% drift)`,
        description: `Compliance shifted from ${Math.round(firstAvg)} (first ${windowSize} sessions) to ${Math.round(lastAvg)} (last ${windowSize} sessions).`,
        confidence,
        sessionCount: group.length,
        evidence: [...firstWindow.slice(0, 2).map((s) => s.id), ...lastWindow.slice(-2).map((s) => s.id)],
        discoveryTokensTotal: 0,
        suggestedAction: drift > 0
          ? `Model ${modelId} is trending positive — consider expanding its use`
          : `Model ${modelId} is trending negative — consider alternatives`,
        createdAt: now(),
        updatedAt: now(),
      });
    }
  }

  return candidates;
}

function detectModelPatternFrequency(
  patternStats: PatternStats,
): EvolutionCandidate[] {
  const candidates: EvolutionCandidate[] = [];

  for (const stat of patternStats.topPatterns) {
    if (stat.count >= 5 && stat.uniqueSessions >= 3) {
      candidates.push({
        id: generateId(),
        type: 'model_pattern_ban',
        title: `Frequent pattern: "${stat.pattern}" (${stat.category})`,
        description: `Detected ${stat.count} times across ${stat.uniqueSessions} sessions. Category: ${stat.category}.`,
        confidence: Math.min(100, stat.count * 8 + stat.uniqueSessions * 5),
        sessionCount: stat.uniqueSessions,
        evidence: [],
        discoveryTokensTotal: 0,
        suggestedAction: `Consider banning pattern "${stat.pattern}" (${stat.category})`,
        createdAt: now(),
        updatedAt: now(),
      });
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Main analyzer
// ---------------------------------------------------------------------------

export function analyzePatterns(
  sessions: SessionState[],
  config: AiddConfig,
  patternStats?: PatternStats,
): EvolutionCandidate[] {
  const minSessions = config.evolution.learningPeriodSessions;
  const candidates: EvolutionCandidate[] = [];

  candidates.push(...detectModelRecommendations(sessions, minSessions));
  candidates.push(...detectRecurringMistakes(sessions, Math.max(3, Math.floor(minSessions / 2))));
  candidates.push(...detectToolSequences(sessions, minSessions));
  candidates.push(...detectSkillCombos(sessions, minSessions));

  // Phase 6 detectors
  candidates.push(...detectContextEfficiency(sessions, minSessions));
  candidates.push(...detectModelDrift(sessions, Math.max(5, minSessions)));
  if (patternStats) {
    candidates.push(...detectModelPatternFrequency(patternStats));
  }

  return candidates;
}
