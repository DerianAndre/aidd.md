import type { SessionState, ModelMetrics } from '../../../lib/types';

/** Group completed sessions by modelId and compute per-model metrics. */
export function computeModelMetrics(sessions: SessionState[]): ModelMetrics[] {
  const byModel = new Map<string, SessionState[]>();
  for (const s of sessions) {
    if (!s.outcome) continue;
    const key = s.aiProvider.modelId || s.aiProvider.model;
    const arr = byModel.get(key) ?? [];
    arr.push(s);
    byModel.set(key, arr);
  }

  return Array.from(byModel.entries()).map(([modelId, group]) => {
    const withOutcome = group.filter((s) => s.outcome);
    const count = withOutcome.length;
    const sumCompliance = withOutcome.reduce((a, s) => a + (s.outcome?.complianceScore ?? 0), 0);
    const sumReverts = withOutcome.reduce((a, s) => a + (s.outcome?.reverts ?? 0), 0);
    const sumReworks = withOutcome.reduce((a, s) => a + (s.outcome?.reworks ?? 0), 0);
    const testPassing = withOutcome.filter((s) => s.outcome?.testsPassing).length;
    const positive = withOutcome.filter((s) => s.outcome?.userFeedback === 'positive').length;
    const withFeedback = withOutcome.filter((s) => s.outcome?.userFeedback).length;

    const taskTypes: Record<string, number> = {};
    for (const s of group) {
      const domain = s.taskClassification?.domain ?? 'unknown';
      taskTypes[domain] = (taskTypes[domain] ?? 0) + 1;
    }

    return {
      provider: group[0]?.aiProvider.provider ?? '',
      model: group[0]?.aiProvider.model ?? '',
      modelId,
      sessionsCount: count,
      avgComplianceScore: count > 0 ? Math.round(sumCompliance / count) : 0,
      avgReverts: count > 0 ? Math.round((sumReverts / count) * 10) / 10 : 0,
      avgReworks: count > 0 ? Math.round((sumReworks / count) * 10) / 10 : 0,
      testPassRate: count > 0 ? Math.round((testPassing / count) * 100) / 100 : 0,
      positiveRate: withFeedback > 0 ? Math.round((positive / withFeedback) * 100) / 100 : 0,
      taskTypes,
    };
  });
}

export interface ToolUsageStat {
  name: string;
  count: number;
  goodRate: number;
}

/** Aggregate tool usage across all sessions. */
export function computeToolUsageStats(sessions: SessionState[]): ToolUsageStat[] {
  const byTool = new Map<string, { count: number; good: number }>();
  for (const s of sessions) {
    for (const t of s.toolsCalled) {
      const entry = byTool.get(t.name) ?? { count: 0, good: 0 };
      entry.count += 1;
      if (t.resultQuality === 'good') entry.good += 1;
      byTool.set(t.name, entry);
    }
  }

  return Array.from(byTool.entries())
    .map(([name, { count, good }]) => ({
      name,
      count,
      goodRate: count > 0 ? Math.round((good / count) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export interface TimelinePoint {
  date: string;
  count: number;
  avgCompliance: number;
}

/** Group sessions by date and compute per-day metrics. */
export function computeSessionTimeline(sessions: SessionState[]): TimelinePoint[] {
  const byDate = new Map<string, SessionState[]>();
  for (const s of sessions) {
    const date = s.startedAt.slice(0, 10); // YYYY-MM-DD
    const arr = byDate.get(date) ?? [];
    arr.push(s);
    byDate.set(date, arr);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, group]) => {
      const withOutcome = group.filter((s) => s.outcome);
      const sum = withOutcome.reduce((a, s) => a + (s.outcome?.complianceScore ?? 0), 0);
      return {
        date,
        count: group.length,
        avgCompliance: withOutcome.length > 0 ? Math.round(sum / withOutcome.length) : 0,
      };
    });
}
