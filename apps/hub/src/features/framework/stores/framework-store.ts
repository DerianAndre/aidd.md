import { create } from 'zustand';
import {
  listFrameworkEntities,
  readFrameworkEntity,
  writeFrameworkEntity,
  deleteFrameworkEntity,
  getFrameworkPath,
  getSyncStatus,
  checkForUpdates,
  syncFramework,
  setAutoSync,
  type FrameworkCategory,
  type FrameworkEntity,
  type SyncInfo,
} from '../../../lib/tauri';

interface FrameworkStoreState {
  frameworkPath: string | null;
  entities: Record<FrameworkCategory, FrameworkEntity[]>;
  loading: Record<FrameworkCategory, boolean>;
  stale: Record<FrameworkCategory, boolean>;
  selectedEntity: FrameworkEntity | null;

  // Sync state
  syncInfo: SyncInfo | null;
  syncing: boolean;
  checking: boolean;

  // Actions
  initialize: () => Promise<void>;
  fetchCategory: (category: FrameworkCategory, projectPath?: string) => Promise<void>;
  readEntity: (category: FrameworkCategory, name: string) => Promise<FrameworkEntity>;
  saveEntity: (category: FrameworkCategory, name: string, content: string) => Promise<void>;
  removeEntity: (category: FrameworkCategory, name: string) => Promise<void>;
  selectEntity: (entity: FrameworkEntity | null) => void;
  invalidateCategory: (category: FrameworkCategory) => void;
  invalidateAll: () => void;

  // Sync actions
  fetchSyncStatus: () => Promise<void>;
  checkUpdates: () => Promise<void>;
  doSync: (version?: string) => Promise<void>;
  toggleAutoSync: (enabled: boolean) => Promise<void>;
}

const CATEGORIES: FrameworkCategory[] = ['rules', 'skills', 'knowledge', 'workflows', 'templates', 'specs'];

const emptyEntities = (): Record<FrameworkCategory, FrameworkEntity[]> =>
  ({ rules: [], skills: [], knowledge: [], workflows: [], templates: [], specs: [] });

const emptyFlags = (): Record<FrameworkCategory, boolean> =>
  ({ rules: false, skills: false, knowledge: false, workflows: false, templates: false, specs: false });

const staleFlags = (): Record<FrameworkCategory, boolean> =>
  ({ rules: true, skills: true, knowledge: true, workflows: true, templates: true, specs: true });

export const useFrameworkStore = create<FrameworkStoreState>((set, get) => ({
  frameworkPath: null,
  entities: emptyEntities(),
  loading: emptyFlags(),
  stale: staleFlags(),
  selectedEntity: null,
  syncInfo: null,
  syncing: false,
  checking: false,

  initialize: async () => {
    const path = await getFrameworkPath();
    set({ frameworkPath: path });
    // Also load local sync status (no network)
    try {
      const info = await getSyncStatus();
      set({ syncInfo: info });
    } catch {
      // ignore
    }
  },

  fetchCategory: async (category, projectPath) => {
    const state = get();
    if (state.loading[category]) return;
    if (!state.stale[category] && state.entities[category].length > 0) return;

    set((s) => ({ loading: { ...s.loading, [category]: true } }));
    try {
      const items = await listFrameworkEntities(category, projectPath);
      set((s) => ({
        entities: { ...s.entities, [category]: items },
        loading: { ...s.loading, [category]: false },
        stale: { ...s.stale, [category]: false },
      }));
    } catch {
      set((s) => ({ loading: { ...s.loading, [category]: false } }));
    }
  },

  readEntity: async (category, name) => {
    return readFrameworkEntity(category, name);
  },

  saveEntity: async (category, name, content) => {
    await writeFrameworkEntity(category, name, content);
    set((s) => ({ stale: { ...s.stale, [category]: true } }));
  },

  removeEntity: async (category, name) => {
    await deleteFrameworkEntity(category, name);
    set((s) => ({
      entities: {
        ...s.entities,
        [category]: s.entities[category].filter((e) => e.name !== name),
      },
      stale: { ...s.stale, [category]: true },
    }));
  },

  selectEntity: (entity) => set({ selectedEntity: entity }),

  invalidateCategory: (category) =>
    set((s) => ({ stale: { ...s.stale, [category]: true } })),

  invalidateAll: () => set({ stale: staleFlags() }),

  // ── Sync actions ───────────────────────────────────────────────────────

  fetchSyncStatus: async () => {
    try {
      const info = await getSyncStatus();
      set({ syncInfo: info });
    } catch {
      // ignore
    }
  },

  checkUpdates: async () => {
    set({ checking: true });
    try {
      const info = await checkForUpdates();
      set({ syncInfo: info, checking: false });
    } catch {
      set({ checking: false });
    }
  },

  doSync: async (version) => {
    set({ syncing: true });
    try {
      const info = await syncFramework(version);
      set({ syncInfo: info, syncing: false, stale: staleFlags() });
    } catch {
      set({ syncing: false });
    }
  },

  toggleAutoSync: async (enabled) => {
    await setAutoSync(enabled);
    set((s) => ({
      syncInfo: s.syncInfo ? { ...s.syncInfo, auto_sync: enabled } : null,
    }));
  },
}));

export { CATEGORIES };
export type { FrameworkCategory };
