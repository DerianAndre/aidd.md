import { create } from 'zustand';
import {
  listFrameworkEntities,
  readFrameworkEntity,
  writeFrameworkEntity,
  deleteFrameworkEntity,
  getFrameworkPath,
  type FrameworkCategory,
  type FrameworkEntity,
} from '../../../lib/tauri';

interface FrameworkStoreState {
  frameworkPath: string | null;
  entities: Record<FrameworkCategory, FrameworkEntity[]>;
  loading: Record<FrameworkCategory, boolean>;
  stale: Record<FrameworkCategory, boolean>;
  selectedEntity: FrameworkEntity | null;

  // Actions
  initialize: () => Promise<void>;
  fetchCategory: (category: FrameworkCategory) => Promise<void>;
  readEntity: (category: FrameworkCategory, name: string) => Promise<FrameworkEntity>;
  saveEntity: (category: FrameworkCategory, name: string, content: string) => Promise<void>;
  removeEntity: (category: FrameworkCategory, name: string) => Promise<void>;
  selectEntity: (entity: FrameworkEntity | null) => void;
  invalidateCategory: (category: FrameworkCategory) => void;
  invalidateAll: () => void;
}

const CATEGORIES: FrameworkCategory[] = ['rules', 'skills', 'knowledge', 'workflows', 'templates', 'spec'];

const emptyEntities = (): Record<FrameworkCategory, FrameworkEntity[]> =>
  ({ rules: [], skills: [], knowledge: [], workflows: [], templates: [], spec: [] });

const emptyFlags = (): Record<FrameworkCategory, boolean> =>
  ({ rules: false, skills: false, knowledge: false, workflows: false, templates: false, spec: false });

const staleFlags = (): Record<FrameworkCategory, boolean> =>
  ({ rules: true, skills: true, knowledge: true, workflows: true, templates: true, spec: true });

export const useFrameworkStore = create<FrameworkStoreState>((set, get) => ({
  frameworkPath: null,
  entities: emptyEntities(),
  loading: emptyFlags(),
  stale: staleFlags(),
  selectedEntity: null,

  initialize: async () => {
    const path = await getFrameworkPath();
    set({ frameworkPath: path });
  },

  fetchCategory: async (category) => {
    const state = get();
    if (state.loading[category]) return;
    if (!state.stale[category] && state.entities[category].length > 0) return;

    set((s) => ({ loading: { ...s.loading, [category]: true } }));
    try {
      const items = await listFrameworkEntities(category);
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
}));

export { CATEGORIES };
export type { FrameworkCategory };
