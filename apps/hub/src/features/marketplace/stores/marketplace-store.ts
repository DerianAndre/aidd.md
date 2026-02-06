// ---------------------------------------------------------------------------
// Marketplace store — fetch/invalidate pattern with remote registry
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type {
  McpServerEntry,
  ContentEntry,
  MarketplaceEntry,
  MarketplaceFilters,
  MarketplaceStats,
  MarketplaceTab,
  SortOption,
  ViewMode,
  McpCategory,
} from '../lib/types';
import { DEFAULT_FILTERS } from '../lib/constants';
import { fetchMcpRegistry, fetchContentRegistry } from '../lib/registry';
import { filterAndSort, computeStats, countByContentType } from '../lib/catalog-helpers';

// ── Store interface ─────────────────────────────────────────────

interface MarketplaceStoreState {
  // Data
  mcpServers: McpServerEntry[];
  content: ContentEntry[];

  // Loading / status
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
  usingFallback: boolean;

  // Filters
  filters: MarketplaceFilters;

  // Derived
  filteredEntries: MarketplaceEntry[];
  stats: MarketplaceStats;
  contentCounts: Record<string, number>;

  // Actions
  fetchCatalog: () => Promise<void>;
  refresh: () => Promise<void>;
  setTab: (tab: MarketplaceTab) => void;
  setSearch: (search: string) => void;
  setSort: (sort: SortOption) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleCategory: (cat: McpCategory) => void;
  toggleTag: (tag: string) => void;
  toggleOfficial: () => void;
  toggleTrending: () => void;
  clearFilters: () => void;
  getEntryBySlug: (type: string, slug: string) => MarketplaceEntry | undefined;
}

// ── Helpers ─────────────────────────────────────────────────────

const EMPTY_STATS: MarketplaceStats = {
  totalMcpServers: 0,
  totalContent: 0,
  totalInstalls: 0,
  categoryCounts: {},
};

function recompute(
  mcpServers: McpServerEntry[],
  content: ContentEntry[],
  filters: MarketplaceFilters,
) {
  return {
    filteredEntries: filterAndSort(mcpServers, content, filters),
    stats: computeStats(mcpServers, content),
    contentCounts: countByContentType(content),
  };
}

function toggleInArray<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

// ── Store ───────────────────────────────────────────────────────

export const useMarketplaceStore = create<MarketplaceStoreState>((set, get) => ({
  // Initial state
  mcpServers: [],
  content: [],
  loading: false,
  error: null,
  lastFetched: null,
  usingFallback: false,
  filters: { ...DEFAULT_FILTERS },
  filteredEntries: [],
  stats: EMPTY_STATS,
  contentCounts: {},

  // Fetch from registry (or fallback)
  fetchCatalog: async () => {
    const { lastFetched } = get();
    if (lastFetched) return; // already fetched this session

    set({ loading: true, error: null });
    try {
      const [mcpResult, contentResult] = await Promise.all([
        fetchMcpRegistry(),
        fetchContentRegistry(),
      ]);

      const usingFallback = !mcpResult.remote || !contentResult.remote;
      const { filters } = get();
      const derived = recompute(mcpResult.entries, contentResult.entries, filters);

      set({
        mcpServers: mcpResult.entries,
        content: contentResult.entries,
        loading: false,
        lastFetched: new Date().toISOString(),
        usingFallback,
        ...derived,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch registry',
      });
    }
  },

  // Force re-fetch
  refresh: async () => {
    set({ lastFetched: null });
    await get().fetchCatalog();
  },

  // Filter setters — each recomputes derived state
  setTab: (tab) => {
    set((s) => {
      const filters = { ...s.filters, tab };
      return { filters, ...recompute(s.mcpServers, s.content, filters) };
    });
  },

  setSearch: (search) => {
    set((s) => {
      const filters = { ...s.filters, search };
      return { filters, ...recompute(s.mcpServers, s.content, filters) };
    });
  },

  setSort: (sort) => {
    set((s) => {
      const filters = { ...s.filters, sort };
      return { filters, ...recompute(s.mcpServers, s.content, filters) };
    });
  },

  setViewMode: (viewMode) => {
    set((s) => ({ filters: { ...s.filters, viewMode } }));
  },

  toggleCategory: (cat) => {
    set((s) => {
      const filters = { ...s.filters, mcpCategories: toggleInArray(s.filters.mcpCategories, cat) };
      return { filters, ...recompute(s.mcpServers, s.content, filters) };
    });
  },

  toggleTag: (tag) => {
    set((s) => {
      const filters = { ...s.filters, tags: toggleInArray(s.filters.tags, tag) };
      return { filters, ...recompute(s.mcpServers, s.content, filters) };
    });
  },

  toggleOfficial: () => {
    set((s) => {
      const filters = { ...s.filters, onlyOfficial: !s.filters.onlyOfficial };
      return { filters, ...recompute(s.mcpServers, s.content, filters) };
    });
  },

  toggleTrending: () => {
    set((s) => {
      const filters = { ...s.filters, onlyTrending: !s.filters.onlyTrending };
      return { filters, ...recompute(s.mcpServers, s.content, filters) };
    });
  },

  clearFilters: () => {
    set((s) => {
      const filters = { ...DEFAULT_FILTERS, tab: s.filters.tab, viewMode: s.filters.viewMode };
      return { filters, ...recompute(s.mcpServers, s.content, filters) };
    });
  },

  getEntryBySlug: (type, slug) => {
    const { mcpServers, content } = get();
    if (type === 'mcp-server' || type === 'mcp') {
      return mcpServers.find((e) => e.slug === slug);
    }
    return content.find((e) => e.slug === slug);
  },
}));
