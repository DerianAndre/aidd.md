import { create } from 'zustand';
import { listDirectory, readJsonFile } from '../../../lib/tauri';
import { statePath, STATE_PATHS } from '../../../lib/constants';
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

  fetch: (projectRoot: string) => Promise<void>;
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

  fetch: async (projectRoot) => {
    if (!get().stale) return;
    set({ loading: true });
    try {
      const dir = statePath(projectRoot, STATE_PATHS.SESSIONS_COMPLETED);
      const files = await listDirectory(dir, ['json']);
      const sessionFiles = files.filter((f) => !f.name.includes('-observations'));
      const sessions = await Promise.all(
        sessionFiles.map((f) => readJsonFile(f.path) as Promise<SessionState>),
      );

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
