// Re-export canonical types from shared
export type {
  EvolutionType,
  EvolutionCandidate,
  EvolutionLogEntry,
  EvolutionSnapshot,
} from '@aidd.md/mcp-shared';

// Module-specific aggregate types (not in StorageBackend)
import type { EvolutionCandidate, EvolutionLogEntry } from '@aidd.md/mcp-shared';

export interface EvolutionState {
  candidates: EvolutionCandidate[];
  updatedAt: string;
}

export interface EvolutionLog {
  entries: EvolutionLogEntry[];
}
