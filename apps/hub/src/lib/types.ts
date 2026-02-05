// Re-export shared types from @aidd.md/mcp-shared
export type {
  AiddConfig,
  AiProvider,
  AnalyticsQuery,
  AnalyticsResult,
  BranchContext,
  ContextBudget,
  MemoryEntry,
  MemoryIndexEntry,
  MemoryTimelineEntry,
  ObservationType,
  ProjectInfo as McpProjectInfo,
  SearchOptions,
  SessionFilter,
  SessionObservation,
  SessionOutcome,
  SessionState,
  StackInfo,
  ToolUsageEntry,
} from '@aidd.md/mcp-shared';

export { DEFAULT_CONFIG } from '@aidd.md/mcp-shared';

// Hub-specific types
export type { ProjectInfo, ProjectEntry, MarkdownEntity, FileEntry, FileChangeEvent } from './tauri';

export type EntityCategory =
  | 'rules'
  | 'skills'
  | 'workflows'
  | 'templates'
  | 'knowledge';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}
