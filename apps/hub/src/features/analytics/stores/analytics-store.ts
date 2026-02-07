import { create } from 'zustand';
import { listAllSessions } from '../../../lib/tauri';
import type { SessionState, ModelMetrics } from '../../../lib/types';
import {
  computeModelMetrics,
  computeToolUsageStats,
  computeSessionTimeline,
  type ToolUsageStat,
  type TimelinePoint,
} from '../lib/compute-analytics';

interface AnalyticsStoreState {
  modelMetrics: ModelMetrics[];
  toolStats: ToolUsageStat[];
  timelineData: TimelinePoint[];
  totalSessions: number;
  avgCompliance: number;
  testPassRate: number;
  uniqueModels: number;
  loading: boolean;
  stale: boolean;

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
  loading: false,
  stale: true,

  fetch: async (_projectRoot?: string) => {
    if (!get().stale) return;
    set({ loading: true });
    try {
      const raw = await listAllSessions(200);
      const sessions = ((raw ?? []) as SessionState[]).filter((s) => !!s.endedAt);

      const modelMetrics = computeModelMetrics(sessions);
      const toolStats = computeToolUsageStats(sessions);
      const timelineData = computeSessionTimeline(sessions);

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
        loading: false,
        stale: false,
      });
    } catch {
      set({ loading: false, stale: false });
    }
  },

  invalidate: () => set({ stale: true }),
}));
