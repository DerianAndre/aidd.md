import { create } from 'zustand';
import {
  checkIntegrations,
  integrateTool,
  removeIntegration,
  type IntegrationConfig,
  type IntegrationResult,
  type IntegrationTool,
} from '../../../lib/tauri';

interface IntegrationsStoreState {
  integrations: IntegrationConfig[];
  loading: boolean;
  lastResult: IntegrationResult | null;

  // Actions
  fetchStatus: (projectPath: string) => Promise<void>;
  integrate: (projectPath: string, tool: IntegrationTool, devMode?: boolean) => Promise<IntegrationResult>;
  remove: (projectPath: string, tool: IntegrationTool) => Promise<IntegrationResult>;
  clearResult: () => void;
}

export const useIntegrationsStore = create<IntegrationsStoreState>((set) => ({
  integrations: [],
  loading: false,
  lastResult: null,

  fetchStatus: async (projectPath) => {
    set({ loading: true });
    try {
      const integrations = await checkIntegrations(projectPath);
      set({ integrations, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  integrate: async (projectPath, tool, devMode) => {
    const result = await integrateTool(projectPath, tool, devMode);
    set({ lastResult: result });
    // Refresh status after integration
    const integrations = await checkIntegrations(projectPath);
    set({ integrations });
    return result;
  },

  remove: async (projectPath, tool) => {
    const result = await removeIntegration(projectPath, tool);
    set({ lastResult: result });
    // Refresh status after removal
    const integrations = await checkIntegrations(projectPath);
    set({ integrations });
    return result;
  },

  clearResult: () => set({ lastResult: null }),
}));
