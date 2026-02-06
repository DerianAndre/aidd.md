import { create } from 'zustand';
import { readJsonFile, fileExists } from '../../../lib/tauri';
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
  loading: boolean;
  stale: boolean;

  fetch: (projectRoot: string) => Promise<void>;
  invalidate: () => void;
}

export const useMcpServersStore = create<McpServersStoreState>((set, get) => ({
  packages: [],
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

      set({ packages: results, loading: false, stale: false });
    } catch {
      set({ loading: false, stale: false });
    }
  },

  invalidate: () => set({ stale: true }),
}));
