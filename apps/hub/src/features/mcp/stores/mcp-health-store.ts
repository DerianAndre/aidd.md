import { create } from 'zustand';
import { scanMcpHealth, type McpHealthReport } from '../../../lib/tauri';

interface McpHealthStoreState {
  report: McpHealthReport | null;
  loading: boolean;
  stale: boolean;

  fetch: (projectPath?: string) => Promise<void>;
  invalidate: () => void;
}

export const useMcpHealthStore = create<McpHealthStoreState>((set, get) => ({
  report: null,
  loading: false,
  stale: true,

  fetch: async (projectPath) => {
    if (!get().stale) return;
    set({ loading: true });
    try {
      const report = await scanMcpHealth(projectPath);
      set({ report, loading: false, stale: false });
    } catch {
      set({ loading: false, stale: false });
    }
  },

  invalidate: () => set({ stale: true }),
}));
