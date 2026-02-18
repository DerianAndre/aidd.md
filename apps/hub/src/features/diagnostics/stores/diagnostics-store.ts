import { create } from 'zustand';
import { listAllSessions, listPermanentMemory, callMcpTool } from '../../../lib/tauri';
import type { SessionState, MistakeEntry, HealthScore } from '../../../lib/types';
import type { HealthTrendResult, SystemHealthResult, SessionComparisonResult } from '../lib/types';
import { computeHealthScore } from '../lib/compute-health';

const STALE_TTL = 30_000;

type TrendPeriod = '7d' | '30d' | '90d' | 'all';

interface DiagnosticsStoreState {
  // Overview (existing)
  healthScore: HealthScore | null;
  topMistakes: MistakeEntry[];
  loading: boolean;
  stale: boolean;
  lastFetchedAt: number;

  // Trending
  trendData: HealthTrendResult | null;
  trendLoading: boolean;
  trendPeriod: TrendPeriod;

  // System health
  systemHealth: SystemHealthResult | null;
  systemHealthLoading: boolean;

  // Session comparison
  sessions: SessionState[];
  comparisonResult: SessionComparisonResult | null;
  comparisonLoading: boolean;

  // MCP availability
  mcpAvailable: boolean | null;

  // Actions
  fetch: (projectRoot?: string) => Promise<void>;
  invalidate: () => void;
  fetchTrend: (period?: TrendPeriod) => Promise<void>;
  setTrendPeriod: (period: TrendPeriod) => void;
  fetchSystemHealth: () => Promise<void>;
  compareSessions: (sessionIds: string[]) => Promise<void>;
}

async function tryMcpCall<T>(toolName: string, args: Record<string, unknown>): Promise<T | null> {
  try {
    return await callMcpTool<T>('engine', toolName, args);
  } catch {
    return null;
  }
}

export const useDiagnosticsStore = create<DiagnosticsStoreState>((set, get) => ({
  healthScore: null,
  topMistakes: [],
  loading: false,
  stale: true,
  lastFetchedAt: 0,

  trendData: null,
  trendLoading: false,
  trendPeriod: '30d',

  systemHealth: null,
  systemHealthLoading: false,

  sessions: [],
  comparisonResult: null,
  comparisonLoading: false,

  mcpAvailable: null,

  fetch: async (_projectRoot?: string) => {
    const { stale, lastFetchedAt, loading } = get();
    if (loading) return;
    const isExpired = Date.now() - lastFetchedAt > STALE_TTL;
    if (!stale && !isExpired) return;
    set({ loading: true });
    try {
      // Load completed sessions from SQLite
      let sessions: SessionState[] = [];
      try {
        const raw = await listAllSessions(200);
        sessions = ((raw ?? []) as SessionState[]).filter((s) => !!s.endedAt);
      } catch {
        // No sessions available
      }

      // Load mistakes from permanent memory
      let mistakes: MistakeEntry[] = [];
      try {
        const raw = await listPermanentMemory('mistake');
        mistakes = (raw ?? []) as MistakeEntry[];
      } catch {
        // No mistakes available
      }

      const healthScore = computeHealthScore(sessions, mistakes);
      const topMistakes = [...mistakes]
        .sort((a, b) => (b.occurrences ?? 1) - (a.occurrences ?? 1))
        .slice(0, 5);

      set({
        healthScore,
        topMistakes,
        sessions,
        loading: false,
        stale: false,
        lastFetchedAt: Date.now(),
      });
    } catch {
      set({ loading: false, stale: false });
    }
  },

  invalidate: () => set({ stale: true }),

  fetchTrend: async (period?: TrendPeriod) => {
    const p = period ?? get().trendPeriod;
    set({ trendLoading: true, trendPeriod: p });
    const result = await tryMcpCall<HealthTrendResult>('aidd_health_trend', { period: p, limit: 30 });
    set({
      trendData: result,
      trendLoading: false,
      mcpAvailable: result !== null,
    });
  },

  setTrendPeriod: (period: TrendPeriod) => {
    set({ trendPeriod: period });
    void get().fetchTrend(period);
  },

  fetchSystemHealth: async () => {
    set({ systemHealthLoading: true });
    const result = await tryMcpCall<SystemHealthResult>('aidd_system_health', {});
    set({
      systemHealth: result,
      systemHealthLoading: false,
      mcpAvailable: result !== null,
    });
  },

  compareSessions: async (sessionIds: string[]) => {
    set({ comparisonLoading: true });
    const result = await tryMcpCall<SessionComparisonResult>('aidd_session_compare', { sessionIds });
    set({
      comparisonResult: result,
      comparisonLoading: false,
      mcpAvailable: result !== null,
    });
  },
}));
