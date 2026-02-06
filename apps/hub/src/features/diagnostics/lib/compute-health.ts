import type { SessionState, MistakeEntry, HealthScore } from '../../../lib/types';

/**
 * Compute a project health score from completed sessions and mistake entries.
 * Returns an overall 0-100 score with per-category breakdowns.
 */
export function computeHealthScore(
  sessions: SessionState[],
  mistakes: MistakeEntry[],
): HealthScore {
  const recommendations: string[] = [];

  if (sessions.length === 0) {
    return {
      overall: 0,
      categories: {
        sessionSuccess: 0,
        complianceAvg: 0,
        errorRecurrence: 100,
        modelConsistency: 100,
        memoryUtilization: 0,
      },
      sessionsAnalyzed: 0,
      recommendations: ['Complete at least one session to generate health metrics.'],
    };
  }

  // 1. Session success rate — % of sessions with passing tests
  const withOutcome = sessions.filter((s) => s.outcome);
  const passingTests = withOutcome.filter((s) => s.outcome?.testsPassing).length;
  const sessionSuccess = withOutcome.length > 0
    ? Math.round((passingTests / withOutcome.length) * 100)
    : 0;
  if (sessionSuccess < 70) {
    recommendations.push('Test pass rate is low. Investigate common test failures.');
  }

  // 2. Average compliance score
  const complianceScores = withOutcome
    .map((s) => s.outcome?.complianceScore ?? 0)
    .filter((v) => v > 0);
  const complianceAvg = complianceScores.length > 0
    ? Math.round(complianceScores.reduce((a, b) => a + b, 0) / complianceScores.length)
    : 0;
  if (complianceAvg < 60) {
    recommendations.push('Compliance scores are below average. Review heuristic guidelines.');
  }

  // 3. Error recurrence — inverse of avg mistake occurrences (lower recurrence = better)
  const avgOccurrences = mistakes.length > 0
    ? mistakes.reduce((a, m) => a + m.occurrences, 0) / mistakes.length
    : 0;
  const errorRecurrence = Math.max(0, Math.round(100 - (avgOccurrences - 1) * 20));
  if (errorRecurrence < 60) {
    recommendations.push('Several mistakes are recurring. Address root causes in ai/memory/mistakes.json.');
  }

  // 4. Model consistency — 1 - std-dev of compliance across models (normalized)
  const modelScores = new Map<string, number[]>();
  for (const s of withOutcome) {
    const score = s.outcome?.complianceScore;
    const modelKey = s.aiProvider?.modelId;
    if (score != null && score > 0 && modelKey) {
      const arr = modelScores.get(modelKey) ?? [];
      arr.push(score);
      modelScores.set(modelKey, arr);
    }
  }
  let modelConsistency = 100;
  if (modelScores.size > 1) {
    const modelAvgs = [...modelScores.values()].map(
      (scores) => scores.reduce((a, b) => a + b, 0) / scores.length,
    );
    const mean = modelAvgs.reduce((a, b) => a + b, 0) / modelAvgs.length;
    const variance = modelAvgs.reduce((a, v) => a + (v - mean) ** 2, 0) / modelAvgs.length;
    const stdDev = Math.sqrt(variance);
    modelConsistency = Math.max(0, Math.round(100 - stdDev));
  }
  if (modelConsistency < 60) {
    recommendations.push('Large variance in model performance. Consider standardizing on top-performing models.');
  }

  // 5. Memory utilization — % of sessions that produced decisions or resolved errors
  const sessionsWithObs = sessions.filter(
    (s) => s.decisions.length > 0 || s.errorsResolved.length > 0,
  ).length;
  const memoryUtilization = Math.round((sessionsWithObs / sessions.length) * 100);
  if (memoryUtilization < 50) {
    recommendations.push('Less than half of sessions produce observations. Enable the observation tool in your workflow.');
  }

  // Overall — weighted sum
  const overall = Math.round(
    sessionSuccess * 0.3 +
    complianceAvg * 0.25 +
    errorRecurrence * 0.15 +
    modelConsistency * 0.15 +
    memoryUtilization * 0.15,
  );

  return {
    overall,
    categories: {
      sessionSuccess,
      complianceAvg,
      errorRecurrence,
      modelConsistency,
      memoryUtilization,
    },
    sessionsAnalyzed: sessions.length,
    recommendations,
  };
}
