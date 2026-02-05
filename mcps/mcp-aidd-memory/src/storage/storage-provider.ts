import type { StorageBackend } from './types.js';
import type { StorageConfig } from './types.js';
import { createStorageBackend } from './factory.js';

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
      this.initPromise = createStorageBackend(this.config).then((b) => {
        this.backend = b;
        return b;
      });
    }
    return this.initPromise;
  }

  async close(): Promise<void> {
    if (this.backend) await this.backend.close();
  }
}
