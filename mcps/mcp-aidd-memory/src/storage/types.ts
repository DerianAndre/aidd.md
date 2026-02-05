import type { StorageBackend } from '@aidd.md/mcp-shared';

export type { StorageBackend };

export interface StorageConfig {
  projectRoot: string;
  aiddDir: string;
  memoryDir: string;
}

export const SCHEMA_VERSION = 1;
