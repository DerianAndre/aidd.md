import type { StorageBackend, StorageConfig } from './types.js';
import { JsonBackend } from './json-backend.js';

export async function createStorageBackend(config: StorageConfig): Promise<StorageBackend> {
  try {
    const { SqliteBackend } = await import('./sqlite-backend.js');
    const backend = new SqliteBackend(config);
    await backend.initialize();
    return backend;
  } catch {
    const backend = new JsonBackend(config);
    await backend.initialize();
    return backend;
  }
}
