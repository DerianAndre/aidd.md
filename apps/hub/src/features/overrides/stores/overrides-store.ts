import { create } from 'zustand';
import {
  getProjectOverrides,
  setAgentOverride,
  addProjectRule,
  removeProjectRule,
  listProjectRules,
  getEffectiveEntities,
  type ProjectOverrides,
  type EffectiveEntity,
  type FrameworkEntity,
  type FrameworkCategory,
} from '../../../lib/tauri';

interface OverridesStoreState {
  projectPath: string | null;
  overrides: ProjectOverrides | null;
  projectRules: FrameworkEntity[];
  effectiveEntities: EffectiveEntity[];
  effectiveCategory: FrameworkCategory | null;
  loading: boolean;

  // Actions
  load: (projectPath: string) => Promise<void>;
  toggleAgent: (agent: string, enabled: boolean) => Promise<void>;
  addRule: (name: string, content: string) => Promise<void>;
  removeRule: (name: string) => Promise<void>;
  fetchEffective: (category: FrameworkCategory) => Promise<void>;
}

export const useOverridesStore = create<OverridesStoreState>((set, get) => ({
  projectPath: null,
  overrides: null,
  projectRules: [],
  effectiveEntities: [],
  effectiveCategory: null,
  loading: false,

  load: async (projectPath) => {
    set({ loading: true, projectPath });
    try {
      const [overrides, projectRules] = await Promise.all([
        getProjectOverrides(projectPath),
        listProjectRules(projectPath),
      ]);
      set({ overrides, projectRules, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  toggleAgent: async (agent, enabled) => {
    const { projectPath } = get();
    if (!projectPath) return;

    await setAgentOverride(projectPath, agent, enabled);
    // Reload overrides
    const overrides = await getProjectOverrides(projectPath);
    set({ overrides });
  },

  addRule: async (name, content) => {
    const { projectPath } = get();
    if (!projectPath) return;

    await addProjectRule(projectPath, name, content);
    const [overrides, projectRules] = await Promise.all([
      getProjectOverrides(projectPath),
      listProjectRules(projectPath),
    ]);
    set({ overrides, projectRules });
  },

  removeRule: async (name) => {
    const { projectPath } = get();
    if (!projectPath) return;

    await removeProjectRule(projectPath, name);
    const [overrides, projectRules] = await Promise.all([
      getProjectOverrides(projectPath),
      listProjectRules(projectPath),
    ]);
    set({ overrides, projectRules });
  },

  fetchEffective: async (category) => {
    const { projectPath } = get();
    if (!projectPath) return;

    const entities = await getEffectiveEntities(projectPath, category);
    set({ effectiveEntities: entities, effectiveCategory: category });
  },
}));
