// ---------------------------------------------------------------------------
// Pure functions for filtering, sorting, searching, and computing stats
// ---------------------------------------------------------------------------

import type {
  MarketplaceEntry,
  McpServerEntry,
  ContentEntry,
  MarketplaceFilters,
  MarketplaceStats,
  ContentType,
  SortOption,
} from './types';
import { TAB_CONTENT_TYPE_MAP } from './constants';

// ── Search ──────────────────────────────────────────────────────

function matchesSearch(entry: MarketplaceEntry, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const haystack = [
    entry.name,
    entry.description,
    entry.author,
    ...entry.tags,
  ].join(' ').toLowerCase();
  return haystack.includes(q);
}

// ── Filter ──────────────────────────────────────────────────────

function filterMcpServers(
  entries: McpServerEntry[],
  filters: MarketplaceFilters,
): McpServerEntry[] {
  return entries.filter((entry) => {
    if (!matchesSearch(entry, filters.search)) return false;
    if (filters.mcpCategories.length > 0 && !filters.mcpCategories.includes(entry.category)) return false;
    if (filters.tags.length > 0 && !filters.tags.every((t) => entry.tags.includes(t))) return false;
    if (filters.onlyOfficial && !entry.official) return false;
    if (filters.onlyTrending && !entry.trending) return false;
    return true;
  });
}

function filterContent(
  entries: ContentEntry[],
  filters: MarketplaceFilters,
  contentType?: ContentType,
): ContentEntry[] {
  return entries.filter((entry) => {
    if (contentType && entry.contentType !== contentType) return false;
    if (!matchesSearch(entry, filters.search)) return false;
    if (filters.tags.length > 0 && !filters.tags.every((t) => entry.tags.includes(t))) return false;
    if (filters.onlyOfficial && !entry.official) return false;
    if (filters.onlyTrending && !entry.trending) return false;
    return true;
  });
}

// ── Sort ────────────────────────────────────────────────────────

function sortEntries<T extends MarketplaceEntry>(entries: T[], sort: SortOption): T[] {
  const sorted = [...entries];
  switch (sort) {
    case 'popular':
      return sorted.sort((a, b) => b.installCount - a.installCount);
    case 'trending':
      return sorted.sort((a, b) => {
        if (a.trending !== b.trending) return a.trending ? -1 : 1;
        return b.installCount - a.installCount;
      });
    case 'newest':
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'alphabetical':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
}

// ── Public API ──────────────────────────────────────────────────

export function filterAndSort(
  mcpServers: McpServerEntry[],
  content: ContentEntry[],
  filters: MarketplaceFilters,
): MarketplaceEntry[] {
  if (filters.tab === 'mcp-servers') {
    const filtered = filterMcpServers(mcpServers, filters);
    return sortEntries(filtered, filters.sort);
  }
  const contentType = TAB_CONTENT_TYPE_MAP[filters.tab];
  const filtered = filterContent(content, filters, contentType);
  return sortEntries(filtered, filters.sort);
}

export function countByContentType(content: ContentEntry[]): Record<ContentType, number> {
  const counts = {} as Record<ContentType, number>;
  for (const entry of content) {
    counts[entry.contentType] = (counts[entry.contentType] ?? 0) + 1;
  }
  return counts;
}

export function computeStats(
  mcpServers: McpServerEntry[],
  content: ContentEntry[],
): MarketplaceStats {
  const categoryCounts: Record<string, number> = {};

  for (const entry of mcpServers) {
    categoryCounts[entry.category] = (categoryCounts[entry.category] ?? 0) + 1;
  }
  for (const entry of content) {
    categoryCounts[entry.contentType] = (categoryCounts[entry.contentType] ?? 0) + 1;
  }

  const totalInstalls =
    mcpServers.reduce((sum, e) => sum + e.installCount, 0) +
    content.reduce((sum, e) => sum + e.installCount, 0);

  return {
    totalMcpServers: mcpServers.length,
    totalContent: content.length,
    totalInstalls,
    categoryCounts,
  };
}

export function formatInstallCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export function getAllTags(entries: MarketplaceEntry[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const tag of entry.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
