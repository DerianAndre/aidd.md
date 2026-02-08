import { create } from 'zustand';
import {
  listArtifacts,
  createArtifact,
  updateArtifact,
  archiveArtifact,
  deleteArtifact,
} from '../../../lib/tauri';
import type { ArtifactEntry } from '../../../lib/types';

const STALE_TTL = 30_000;

interface ArtifactsStoreState {
  artifacts: ArtifactEntry[];
  loading: boolean;
  stale: boolean;
  lastFetchedAt: number;

  fetch: (projectRoot?: string) => Promise<void>;
  invalidate: () => void;

  create: (type: string, feature: string, title: string, description: string, content: string) => Promise<void>;
  update: (id: string, artifactType: string, feature: string, title: string, description: string, content: string, status: string) => Promise<void>;
  archive: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useArtifactsStore = create<ArtifactsStoreState>((set, get) => ({
  artifacts: [],
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
      const raw = await listArtifacts();
      const artifacts = ((raw ?? []) as ArtifactEntry[]).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      set({ artifacts, loading: false, stale: false, lastFetchedAt: Date.now() });
    } catch {
      set({ artifacts: [], loading: false, stale: false });
    }
  },

  invalidate: () => set({ stale: true }),

  create: async (type, feature, title, description, content) => {
    await createArtifact(type, feature, title, description, content);
    set({ stale: true });
    get().fetch();
  },

  update: async (id, artifactType, feature, title, description, content, status) => {
    await updateArtifact(id, artifactType, feature, title, description, content, status);
    set({ stale: true });
    get().fetch();
  },

  archive: async (id) => {
    await archiveArtifact(id);
    set({
      artifacts: get().artifacts.map((a) =>
        a.id === id ? { ...a, status: 'done' as const } : a,
      ),
    });
  },

  remove: async (id) => {
    await deleteArtifact(id);
    set({ artifacts: get().artifacts.filter((a) => a.id !== id) });
  },
}));
