import { create } from 'zustand';
import { readJsonFile } from '../../../lib/tauri';
import { statePath, STATE_PATHS } from '../../../lib/constants';
import type { EvolutionCandidate, EvolutionLogEntry } from '../../../lib/types';

interface EvolutionStoreState {
  candidates: EvolutionCandidate[];
  logEntries: EvolutionLogEntry[];
  loading: boolean;
  stale: boolean;

  fetch: (projectRoot: string) => Promise<void>;
  invalidate: () => void;
}

export const useEvolutionStore = create<EvolutionStoreState>((set, get) => ({
  candidates: [],
  logEntries: [],
  loading: false,
  stale: true,

  fetch: async (projectRoot) => {
    if (!get().stale) return;
    set({ loading: true });
    try {
      const base = statePath(projectRoot, STATE_PATHS.EVOLUTION);

      let candidates: EvolutionCandidate[] = [];
      let logEntries: EvolutionLogEntry[] = [];

      try {
        const pending = (await readJsonFile(`${base}/pending.json`)) as {
          candidates?: EvolutionCandidate[];
        };
        candidates = pending.candidates ?? [];
      } catch {
        // pending.json may not exist
      }

      try {
        const log = (await readJsonFile(`${base}/log.json`)) as {
          entries?: EvolutionLogEntry[];
        };
        logEntries = log.entries ?? [];
      } catch {
        // log.json may not exist
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
