import { create } from 'zustand';
import {
  listEvolutionCandidates,
  listEvolutionLog,
  approveEvolutionCandidate,
  rejectEvolutionCandidate,
  createEvolutionCandidateEntry,
  updateEvolutionCandidateEntry,
  deleteEvolutionCandidate,
} from '../../../lib/tauri';
import type { EvolutionCandidate, EvolutionLogEntry, EvolutionType } from '../../../lib/types';

const STALE_TTL = 30_000;

interface EvolutionStoreState {
  candidates: EvolutionCandidate[];
  logEntries: EvolutionLogEntry[];
  loading: boolean;
  stale: boolean;
  lastFetchedAt: number;

  fetch: (projectRoot?: string) => Promise<void>;
  invalidate: () => void;

  approveCandidate: (id: string) => Promise<void>;
  rejectCandidate: (id: string, reason: string) => Promise<void>;
  createCandidate: (evoType: EvolutionType, title: string, confidence: number, data: Record<string, unknown>) => Promise<void>;
  updateCandidate: (id: string, evoType: EvolutionType, title: string, confidence: number, data: Record<string, unknown>) => Promise<void>;
  removeCandidate: (id: string) => Promise<void>;
}

export const useEvolutionStore = create<EvolutionStoreState>((set, get) => ({
  candidates: [],
  logEntries: [],
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

      candidates.sort((a, b) => b.confidence - a.confidence);
      logEntries.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      set({ candidates, logEntries, loading: false, stale: false, lastFetchedAt: Date.now() });
    } catch {
      set({ loading: false, stale: false });
    }
  },

  invalidate: () => set({ stale: true }),

  approveCandidate: async (id) => {
    await approveEvolutionCandidate(id);
    set({ candidates: get().candidates.filter((c) => c.id !== id), stale: true });
    get().fetch();
  },

  rejectCandidate: async (id, reason) => {
    await rejectEvolutionCandidate(id, reason);
    set({ candidates: get().candidates.filter((c) => c.id !== id), stale: true });
    get().fetch();
  },

  createCandidate: async (evoType, title, confidence, data) => {
    await createEvolutionCandidateEntry(evoType, title, confidence, JSON.stringify(data));
    set({ stale: true });
    get().fetch();
  },

  updateCandidate: async (id, evoType, title, confidence, data) => {
    await updateEvolutionCandidateEntry(id, evoType, title, confidence, JSON.stringify(data));
    set({ stale: true });
    get().fetch();
  },

  removeCandidate: async (id) => {
    await deleteEvolutionCandidate(id);
    set({ candidates: get().candidates.filter((c) => c.id !== id) });
  },
}));
