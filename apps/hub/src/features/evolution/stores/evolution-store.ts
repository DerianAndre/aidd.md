import { create } from 'zustand';
import { listEvolutionCandidates, listEvolutionLog } from '../../../lib/tauri';
import type { EvolutionCandidate, EvolutionLogEntry } from '../../../lib/types';

interface EvolutionStoreState {
  candidates: EvolutionCandidate[];
  logEntries: EvolutionLogEntry[];
  loading: boolean;
  stale: boolean;

  fetch: (projectRoot?: string) => Promise<void>;
  invalidate: () => void;
}

export const useEvolutionStore = create<EvolutionStoreState>((set, get) => ({
  candidates: [],
  logEntries: [],
  loading: false,
  stale: true,

  fetch: async (_projectRoot?: string) => {
    if (!get().stale) return;
    set({ loading: true });
    try {
      let candidates: EvolutionCandidate[] = [];
      let logEntries: EvolutionLogEntry[] = [];

      try {
        const raw = await listEvolutionCandidates();
        candidates = (raw ?? []) as EvolutionCandidate[];
      } catch {
        // No candidates
      }

      try {
        const raw = await listEvolutionLog(100);
        logEntries = (raw ?? []) as EvolutionLogEntry[];
      } catch {
        // No log entries
      }

      // Sort candidates by confidence desc, log by timestamp desc
      candidates.sort((a, b) => b.confidence - a.confidence);
      logEntries.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      set({ candidates, logEntries, loading: false, stale: false });
    } catch {
      set({ loading: false, stale: false });
    }
  },

  invalidate: () => set({ stale: true }),
}));
