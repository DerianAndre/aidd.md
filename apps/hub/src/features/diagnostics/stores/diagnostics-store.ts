import { create } from 'zustand';
import { listDirectory, readJsonFile } from '../../../lib/tauri';
import { normalizePath } from '../../../lib/utils';
import type { SessionState, MistakeEntry, HealthScore } from '../../../lib/types';
import { computeHealthScore } from '../lib/compute-health';

interface DiagnosticsStoreState {
  healthScore: HealthScore | null;
  topMistakes: MistakeEntry[];
  loading: boolean;
  stale: boolean;

  fetch: (projectRoot: string) => Promise<void>;
  invalidate: () => void;
}

export const useDiagnosticsStore = create<DiagnosticsStoreState>((set, get) => ({
  healthScore: null,
  topMistakes: [],
  loading: false,
  stale: true,

  fetch: async (projectRoot) => {
    if (!get().stale) return;
    set({ loading: true });
    try {
      const root = normalizePath(projectRoot);

      // Load completed sessions
      let sessions: SessionState[] = [];
      try {
        const dir = `${root}/.aidd/sessions/completed`;
        const files = await listDirectory(dir, ['json']);
        const sessionFiles = files.filter((f) => !f.name.includes('-observations'));
        sessions = await Promise.all(
          sessionFiles.map((f) => readJsonFile(f.path) as Promise<SessionState>),
        );
      } catch {
        // No completed sessions
      }

      // Load mistakes
      let mistakes: MistakeEntry[] = [];
      try {
        const raw = await readJsonFile(`${root}/.aidd/memory/mistakes.json`);
        if (Array.isArray(raw)) mistakes = raw as MistakeEntry[];
      } catch {
        // No mistakes file
      }

      const healthScore = computeHealthScore(sessions, mistakes);
      const topMistakes = [...mistakes]
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 5);

      set({ healthScore, topMistakes, loading: false, stale: false });
    } catch {
      set({ loading: false, stale: false });
    }
  },

  invalidate: () => set({ stale: true }),
}));
