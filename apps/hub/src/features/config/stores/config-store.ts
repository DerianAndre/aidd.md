import { create } from 'zustand';
import { readJsonFile, writeJsonFile, fileExists } from '../../../lib/tauri';
import { normalizePath } from '../../../lib/utils';
import type { AiddConfig } from '../../../lib/types';
import { DEFAULT_CONFIG } from '../../../lib/types';

function mergeConfig(partial: Record<string, unknown>): AiddConfig {
  const p = partial as Partial<AiddConfig>;
  return {
    evolution: { ...DEFAULT_CONFIG.evolution, ...p.evolution },
    memory: { ...DEFAULT_CONFIG.memory, ...p.memory },
    modelTracking: { ...DEFAULT_CONFIG.modelTracking, ...p.modelTracking },
    ci: { ...DEFAULT_CONFIG.ci, ...p.ci },
    content: { ...DEFAULT_CONFIG.content, ...p.content },
  };
}

interface ConfigStoreState {
  config: AiddConfig;
  loading: boolean;
  stale: boolean;
  saving: boolean;

  fetch: (projectRoot: string) => Promise<void>;
  save: (projectRoot: string, config: AiddConfig) => Promise<void>;
  reset: () => void;
  invalidate: () => void;
}

export const useConfigStore = create<ConfigStoreState>((set, get) => ({
  config: { ...DEFAULT_CONFIG },
  loading: false,
  stale: true,
  saving: false,

  fetch: async (projectRoot) => {
    if (!get().stale || get().saving) return;
    set({ loading: true });
    try {
      const path = `${normalizePath(projectRoot)}/.aidd/config.json`;
      if (await fileExists(path)) {
        const raw = await readJsonFile(path);
        const config = mergeConfig(raw as Record<string, unknown>);
        set({ config, loading: false, stale: false });
      } else {
        set({ config: { ...DEFAULT_CONFIG }, loading: false, stale: false });
      }
    } catch {
      set({ config: { ...DEFAULT_CONFIG }, loading: false, stale: false });
    }
  },

  save: async (projectRoot, config) => {
    set({ saving: true });
    try {
      const path = `${normalizePath(projectRoot)}/.aidd/config.json`;
      await writeJsonFile(path, config);
      set({ config, saving: false });
    } catch {
      set({ saving: false });
    }
  },

  reset: () => set({ config: { ...DEFAULT_CONFIG } }),

  invalidate: () => {
    if (!get().saving) set({ stale: true });
  },
}));
