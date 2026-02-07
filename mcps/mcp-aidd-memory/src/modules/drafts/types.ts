// Re-export canonical types from shared
export type { DraftEntry } from '@aidd.md/mcp-shared';

// Module-specific types (not in StorageBackend)
export type DraftCategory = 'rules' | 'knowledge' | 'skills' | 'workflows';
export type DraftStatus = 'pending' | 'approved' | 'rejected';
