import { create } from 'zustand';
import { listAllSessions, listPermanentMemory } from '../../../lib/tauri';
import type { SessionState, MistakeEntry, HealthScore } from '../../../lib/types';
import { computeHealthScore } from '../lib/compute-health';

interface DiagnosticsStoreState {
  healthScore: HealthScore | null;
  topMistakes: MistakeEntry[];
  loading: boolean;
  stale: boolean;

  fetch: (projectRoot?: string) => Promise<void>;
  invalidate: () => void;
}

export const useDiagnosticsStore = create<DiagnosticsStoreState>((set, get) => ({
  healthScore: null,
  topMistakes: [],
  loading: false,
  stale: true,

  fetch: async (_projectRoot?: string) => {
    if (!get().stale) return;
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

      set({ healthScore, topMistakes, loading: false, stale: false });
    } catch {
      set({ loading: false, stale: false });
    }
  },

  invalidate: () => set({ stale: true }),
}));
