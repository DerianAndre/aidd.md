import type { StorageBackend } from './types.js';
import type { StorageConfig } from './types.js';
import { SqliteBackend } from './sqlite-backend.js';

export class StorageProvider {
  private backend: StorageBackend | null = null;
  private config: StorageConfig | null = null;
  private initPromise: Promise<StorageBackend> | null = null;

  setConfig(config: StorageConfig): void {
    this.config = config;
  }

  async getBackend(): Promise<StorageBackend> {
    if (this.backend) return this.backend;
    if (!this.initPromise) {
      if (!this.config) throw new Error('StorageProvider not configured — call setConfig() first');
      this.initPromise = Promise.resolve().then(() => {
        const backend = new SqliteBackend(this.config!);
        backend.initialize();
        this.backend = backend;
        return backend;
      });
    }
    return this.initPromise;
  }

  async close(): Promise<void> {
    if (this.backend) {
      this.backend.checkpoint();
      this.backend.close();
    }
  }
}
