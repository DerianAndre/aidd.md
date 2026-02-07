// Re-export shared types for local use
export type {
  BannedPattern,
  PatternDetection,
  AuditScore,
  PatternStats,
  ModelFingerprint,
  BannedPatternFilter,
  PatternStatsFilter,
} from '@aidd.md/mcp-shared';

/** Result of scanning text against banned + built-in patterns. */
export interface PatternMatch {
  patternId?: string;
  label: string;
  category: string;
  matchedText: string;
  context: string;
}
