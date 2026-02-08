import { create } from 'zustand';
import {
  listPermanentMemory,
  deletePermanentMemory,
  createPermanentMemory,
  updatePermanentMemory,
} from '../../../lib/tauri';
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

  // Decision CRUD
  addDecision: (decision: string, reasoning: string, alternatives?: string[], context?: string) => Promise<void>;
  editDecision: (id: string, decision: string, reasoning: string, alternatives?: string[], context?: string) => Promise<void>;
  removeDecision: (projectRoot: string, id: string) => Promise<void>;

  // Mistake CRUD
  addMistake: (error: string, rootCause: string, fix: string, prevention: string) => Promise<void>;
  editMistake: (id: string, error: string, rootCause: string, fix: string, prevention: string) => Promise<void>;
  removeMistake: (projectRoot: string, id: string) => Promise<void>;

  // Convention CRUD
  addConvention: (convention: string, example: string, rationale?: string) => Promise<void>;
  editConvention: (id: string, convention: string, example: string, rationale?: string) => Promise<void>;
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

  // --- Decisions ---
  addDecision: async (decision, reasoning, alternatives, context) => {
    const content = JSON.stringify({ reasoning, alternatives: alternatives ?? [], context: context ?? '' });
    await createPermanentMemory('decision', decision, content);
    set({ stale: true });
    get().fetch();
  },

  editDecision: async (id, decision, reasoning, alternatives, context) => {
    const content = JSON.stringify({ reasoning, alternatives: alternatives ?? [], context: context ?? '' });
    await updatePermanentMemory(id, decision, content);
    set({ stale: true });
    get().fetch();
  },

  removeDecision: async (_projectRoot, id) => {
    await deletePermanentMemory('decision', id);
    set({ decisions: get().decisions.filter((d) => d.id !== id) });
  },

  // --- Mistakes ---
  addMistake: async (error, rootCause, fix, prevention) => {
    const content = JSON.stringify({ rootCause, fix, prevention, occurrences: 1, lastSeenAt: new Date().toISOString() });
    await createPermanentMemory('mistake', error, content);
    set({ stale: true });
    get().fetch();
  },

  editMistake: async (id, error, rootCause, fix, prevention) => {
    const content = JSON.stringify({ rootCause, fix, prevention });
    await updatePermanentMemory(id, error, content);
    set({ stale: true });
    get().fetch();
  },

  removeMistake: async (_projectRoot, id) => {
    await deletePermanentMemory('mistake', id);
    set({ mistakes: get().mistakes.filter((m) => m.id !== id) });
  },

  // --- Conventions ---
  addConvention: async (convention, example, rationale) => {
    const content = JSON.stringify({ example, rationale: rationale ?? '' });
    await createPermanentMemory('convention', convention, content);
    set({ stale: true });
    get().fetch();
  },

  editConvention: async (id, convention, example, rationale) => {
    const content = JSON.stringify({ example, rationale: rationale ?? '' });
    await updatePermanentMemory(id, convention, content);
    set({ stale: true });
    get().fetch();
  },

  removeConvention: async (_projectRoot, id) => {
    await deletePermanentMemory('convention', id);
    set({ conventions: get().conventions.filter((c) => c.id !== id) });
  },
}));
