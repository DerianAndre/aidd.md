import { create } from 'zustand';
import { listAllSessions, listAuditScores } from '../../../lib/tauri';
import type { SessionState, ModelMetrics, AuditScore } from '../../../lib/types';
import {
  computeModelMetrics,
  computeToolUsageStats,
  computeSessionTimeline,
  computeSessionEfficiencyMetrics,
  computeAuditDimensionAverages,
  type ToolUsageStat,
  type TimelinePoint,
  type AuditDimensionAverages,
} from '../lib/compute-analytics';

const STALE_TTL = 30_000;

interface AnalyticsStoreState {
  modelMetrics: ModelMetrics[];
  toolStats: ToolUsageStat[];
  timelineData: TimelinePoint[];
  totalSessions: number;
  avgCompliance: number;
  testPassRate: number;
  uniqueModels: number;
  avgStartupMs: number;
  avgGovernanceOverheadMs: number;
  avgContextEfficiency: number;
  avgTidBonus: number;
  auditDimensions: AuditDimensionAverages | null;
  loading: boolean;
  stale: boolean;
  lastFetchedAt: number;

  fetch: (projectRoot?: string) => Promise<void>;
  invalidate: () => void;
}

export const useAnalyticsStore = create<AnalyticsStoreState>((set, get) => ({
  modelMetrics: [],
  toolStats: [],
  timelineData: [],
  totalSessions: 0,
  avgCompliance: 0,
  testPassRate: 0,
  uniqueModels: 0,
  avgStartupMs: 0,
  avgGovernanceOverheadMs: 0,
  avgContextEfficiency: 0,
  avgTidBonus: 0,
  auditDimensions: null,
  loading: false,
  stale: true,
  lastFetchedAt: 0,

  fetch: async (_projectRoot?: string) => {
    const { stale, lastFetchedAt, loading } = get();
    if (loading) return;
    const isExpired = Date.now() - lastFetchedAt > STALE_TTL;
    if (!stale && !isExpired) return;
    set({ loading: true });
    try {
      const [raw, rawAudit] = await Promise.all([
        listAllSessions(200),
        listAuditScores(300).catch(() => [] as unknown[]),
      ]);
      const sessions = ((raw ?? []) as SessionState[]).filter((s) => !!s.endedAt);
      const auditScores = (rawAudit ?? []) as AuditScore[];

      const modelMetrics = computeModelMetrics(sessions);
      const toolStats = computeToolUsageStats(sessions);
      const timelineData = computeSessionTimeline(sessions);
      const efficiency = computeSessionEfficiencyMetrics(sessions);
      const auditDimensions = computeAuditDimensionAverages(auditScores);

      const withOutcome = sessions.filter((s) => s.outcome);
      const totalSessions = withOutcome.length;
      const sumCompliance = withOutcome.reduce((a, s) => a + (s.outcome?.complianceScore ?? 0), 0);
      const testPassing = withOutcome.filter((s) => s.outcome?.testsPassing).length;

      set({
        modelMetrics,
        toolStats,
        timelineData,
        totalSessions,
        avgCompliance: totalSessions > 0 ? Math.round(sumCompliance / totalSessions) : 0,
        testPassRate: totalSessions > 0 ? Math.round((testPassing / totalSessions) * 100) : 0,
        uniqueModels: modelMetrics.length,
        avgStartupMs: efficiency.avgStartupMs,
        avgGovernanceOverheadMs: efficiency.avgGovernanceOverheadMs,
        avgContextEfficiency: efficiency.avgContextEfficiency,
        avgTidBonus: auditDimensions?.tidBonus ?? 0,
        auditDimensions,
        loading: false,
        stale: false,
        lastFetchedAt: Date.now(),
      });
    } catch {
      set({ loading: false, stale: false });
    }
  },

  invalidate: () => set({ stale: true }),
}));
