import { create } from 'zustand';
import {
  listAllObservations,
  createObservation,
  updateObservation,
  deleteObservation,
} from '../../../lib/tauri';
import type { SessionObservation, ObservationType } from '../../../lib/types';

const STALE_TTL = 30_000;

interface ObservationsStoreState {
  observations: SessionObservation[];
  loading: boolean;
  stale: boolean;
  lastFetchedAt: number;

  fetch: () => Promise<void>;
  invalidate: () => void;

  addObservation: (
    sessionId: string,
    obsType: ObservationType,
    title: string,
    narrative?: string,
  ) => Promise<void>;

  editObservation: (
    id: string,
    obsType: ObservationType,
    title: string,
    narrative?: string,
    facts?: string,
    concepts?: string,
    filesRead?: string,
    filesModified?: string,
    discoveryTokens?: number,
  ) => Promise<void>;
  removeObservation: (id: string) => Promise<void>;
}

export const useObservationsStore = create<ObservationsStoreState>((set, get) => ({
  observations: [],
  loading: false,
  stale: true,
  lastFetchedAt: 0,

  fetch: async () => {
    const { stale, lastFetchedAt, loading } = get();
    if (loading) return;
    const isExpired = Date.now() - lastFetchedAt > STALE_TTL;
    if (!stale && !isExpired) return;
    set({ loading: true });
    try {
      const raw = await listAllObservations(500);
      const allObs = ((raw ?? []) as SessionObservation[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      set({ observations: allObs, loading: false, stale: false, lastFetchedAt: Date.now() });
    } catch {
      set({ observations: [], loading: false, stale: false });
    }
  },

  invalidate: () => set({ stale: true }),

  addObservation: async (sessionId, obsType, title, narrative) => {
    await createObservation(sessionId, obsType, title, narrative);
    set({ stale: true });
    get().fetch();
  },

  editObservation: async (id, obsType, title, narrative, facts, concepts, filesRead, filesModified, discoveryTokens) => {
    await updateObservation(id, obsType, title, narrative, facts, concepts, filesRead, filesModified, discoveryTokens);
    set({ stale: true });
    get().fetch();
  },

  removeObservation: async (id) => {
    await deleteObservation(id);
    set({ observations: get().observations.filter((o) => o.id !== id) });
  },
}));
