import { create } from 'zustand';
import { readJsonFile, fileExists, startMcpServer, stopMcpServer, stopAllMcpServers, getMcpServers } from '../../../lib/tauri';
import type { McpServer, McpServerMode } from '../../../lib/tauri';
import { normalizePath } from '../../../lib/utils';
import { MCP_PACKAGES } from '../lib/mcp-catalog';

export interface McpPackageStatus {
  name: string;
  dir: string;
  version: string;
  built: boolean;
}

interface McpServersStoreState {
  packages: McpPackageStatus[];
  servers: McpServer[];
  loading: boolean;
  stale: boolean;

  fetch: (projectRoot: string) => Promise<void>;
  invalidate: () => void;
  refreshServers: () => Promise<void>;
  start: (pkg: string, mode: McpServerMode) => Promise<McpServer>;
  stop: (serverId: string) => Promise<void>;
  stopAll: () => Promise<void>;
}

export const useMcpServersStore = create<McpServersStoreState>((set, get) => ({
  packages: [],
  servers: [],
  loading: false,
  stale: true,

  fetch: async (projectRoot) => {
    if (!get().stale) return;
    set({ loading: true });
    try {
      const root = normalizePath(projectRoot);
      const results: McpPackageStatus[] = [];

      for (const pkg of MCP_PACKAGES) {
        const pkgJsonPath = `${root}/mcps/${pkg.dir}/package.json`;
        const distPath = `${root}/mcps/${pkg.dir}/dist/index.js`;

        let version = '0.0.0';
        try {
          const data = await readJsonFile(pkgJsonPath) as Record<string, unknown>;
          if (typeof data.version === 'string') version = data.version;
        } catch {
          // package.json not found — leave default version
        }

        let built = false;
        try {
          built = await fileExists(distPath);
        } catch {
          // ignore
        }

        results.push({ name: pkg.name, dir: pkg.dir, version, built });
      }

      // Also fetch running servers
      let servers: McpServer[] = [];
      try {
        servers = await getMcpServers();
      } catch {
        // ignore — no servers running
      }

      set({ packages: results, servers, loading: false, stale: false });
    } catch {
      set({ loading: false, stale: false });
    }
  },

  invalidate: () => set({ stale: true }),

  refreshServers: async () => {
    try {
      const servers = await getMcpServers();
      set({ servers });
    } catch {
      // ignore
    }
  },

  start: async (pkg, mode) => {
    const server = await startMcpServer(pkg, mode);
    await get().refreshServers();
    return server;
  },

  stop: async (serverId) => {
    await stopMcpServer(serverId);
    await get().refreshServers();
  },

  stopAll: async () => {
    await stopAllMcpServers();
    await get().refreshServers();
  },
}));
