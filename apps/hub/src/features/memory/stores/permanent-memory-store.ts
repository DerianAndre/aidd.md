import { create } from 'zustand';
import { listPermanentMemory, deletePermanentMemory } from '../../../lib/tauri';
import type { DecisionEntry, MistakeEntry, ConventionEntry } from '../../../lib/types';

const STALE_TTL = 30_000;

interface PermanentMemoryStoreState {
  decisions: DecisionEntry[];
  mistakes: MistakeEntry[];
  conventions: ConventionEntry[];
  loading: boolean;
  stale: boolean;
  lastFetchedAt: number;

  fetch: (projectRoot?: string) => Promise<void>;
  invalidate: () => void;

  removeDecision: (projectRoot: string, id: string) => Promise<void>;
  removeMistake: (projectRoot: string, id: string) => Promise<void>;
  removeConvention: (projectRoot: string, id: string) => Promise<void>;
}

export const usePermanentMemoryStore = create<PermanentMemoryStoreState>((set, get) => ({
  decisions: [],
  mistakes: [],
  conventions: [],
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
      const [decisions, mistakes, conventions] = await Promise.all([
        listPermanentMemory('decision').then((r) => (r ?? []) as DecisionEntry[]),
        listPermanentMemory('mistake').then((r) => (r ?? []) as MistakeEntry[]),
        listPermanentMemory('convention').then((r) => (r ?? []) as ConventionEntry[]),
      ]);
      set({ decisions, mistakes, conventions, loading: false, stale: false, lastFetchedAt: Date.now() });
    } catch {
      set({ loading: false, stale: false });
    }
  },

  invalidate: () => set({ stale: true }),

  removeDecision: async (_projectRoot, id) => {
    try {
      await deletePermanentMemory('decision', id);
      set({ decisions: get().decisions.filter((d) => d.id !== id) });
    } catch { /* ignore */ }
  },

  removeMistake: async (_projectRoot, id) => {
    try {
      await deletePermanentMemory('mistake', id);
      set({ mistakes: get().mistakes.filter((m) => m.id !== id) });
    } catch { /* ignore */ }
  },

  removeConvention: async (_projectRoot, id) => {
    try {
      await deletePermanentMemory('convention', id);
      set({ conventions: get().conventions.filter((c) => c.id !== id) });
    } catch { /* ignore */ }
  },
}));
