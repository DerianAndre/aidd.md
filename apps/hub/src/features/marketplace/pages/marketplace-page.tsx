import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Server,
  Bot,
  ShieldCheck,
  Zap,
  BookOpen,
  GitBranch,
  FileText,
  FileCode,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { MarketplaceCard } from '../components/marketplace-card';
import { MarketplaceTable } from '../components/marketplace-table';
import { FilterBar } from '../components/filter-bar';
import { StatCards } from '../components/stat-cards';
import { useMarketplaceStore } from '../stores/marketplace-store';
import { TAB_CONTENT_TYPE_MAP } from '../lib/constants';
import type { MarketplaceEntry, MarketplaceTab } from '../lib/types';

const TAB_META: Record<MarketplaceTab, { label: string; icon: LucideIcon }> = {
  'mcp-servers': { label: 'MCP Servers', icon: Server },
  'agents': { label: 'Agents', icon: Bot },
  'rules': { label: 'Rules', icon: ShieldCheck },
  'skills': { label: 'Skills', icon: Zap },
  'knowledge': { label: 'Knowledge', icon: BookOpen },
  'workflows': { label: 'Workflows', icon: GitBranch },
  'templates': { label: 'Templates', icon: FileText },
  'spec': { label: 'Spec', icon: FileCode },
};

const SKELETON_COUNT = 6;

export function MarketplacePage() {
  const navigate = useNavigate();

  // Store selectors
  const fetchCatalog = useMarketplaceStore((s) => s.fetchCatalog);
  const refresh = useMarketplaceStore((s) => s.refresh);
  const loading = useMarketplaceStore((s) => s.loading);
  const usingFallback = useMarketplaceStore((s) => s.usingFallback);
  const filters = useMarketplaceStore((s) => s.filters);
  const filteredEntries = useMarketplaceStore((s) => s.filteredEntries);
  const stats = useMarketplaceStore((s) => s.stats);
  const mcpServers = useMarketplaceStore((s) => s.mcpServers);
  const contentCounts = useMarketplaceStore((s) => s.contentCounts);

  // Actions
  const setTab = useMarketplaceStore((s) => s.setTab);
  const setSearch = useMarketplaceStore((s) => s.setSearch);
  const setSort = useMarketplaceStore((s) => s.setSort);
  const setViewMode = useMarketplaceStore((s) => s.setViewMode);
  const toggleCategory = useMarketplaceStore((s) => s.toggleCategory);
  const toggleOfficial = useMarketplaceStore((s) => s.toggleOfficial);
  const toggleTrending = useMarketplaceStore((s) => s.toggleTrending);
  const clearFilters = useMarketplaceStore((s) => s.clearFilters);

  // Fetch on mount
  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  const handleTabChange = (value: string) => {
    setTab(value as MarketplaceTab);
  };

  const handleEntryClick = (entry: MarketplaceEntry) => {
    const type = entry.type === 'mcp-server' ? 'mcp' : 'content';
    navigate(`/marketplace/${type}/${entry.slug}`);
  };

  return (
    <div>
      <PageHeader
        title="Marketplace"
        description="Discover and install MCP servers, skills, and AIDD content"
        actions={
          <div className="flex items-center gap-2">
            {usingFallback && (
              <Chip size="sm" color="warning">Offline</Chip>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={() => void refresh()}
            >
              {loading ? <Spinner size="sm" /> : <RefreshCw size={14} />}
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <StatCards stats={stats} usingFallback={usingFallback} />

      {/* Tabs */}
      <Tabs
        value={filters.tab}
        onValueChange={handleTabChange}
      >
        <TabsList>
          {(Object.keys(TAB_META) as MarketplaceTab[]).map((tab) => {
            const meta = TAB_META[tab];
            const Icon = meta.icon;
            const contentType = TAB_CONTENT_TYPE_MAP[tab];
            const count = tab === 'mcp-servers'
              ? mcpServers.length
              : (contentType ? (contentCounts[contentType] ?? 0) : 0);
            return (
              <TabsTrigger key={tab} value={tab}>
                <span className="flex items-center gap-1.5">
                  <Icon size={14} />
                  {meta.label}
                  {count > 0 && (
                    <Chip size="sm">{count}</Chip>
                  )}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(TAB_META) as MarketplaceTab[]).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="pt-4 space-y-4">
              {/* Filter bar */}
              <FilterBar
                filters={filters}
                resultCount={filteredEntries.length}
                onSearchChange={setSearch}
                onSortChange={setSort}
                onViewModeChange={setViewMode}
                onCategoryToggle={toggleCategory}
                onOfficialToggle={toggleOfficial}
                onTrendingToggle={toggleTrending}
                onClearFilters={clearFilters}
              />

              {/* Loading */}
              {loading && (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                  ))}
                </div>
              )}

              {/* Results */}
              {!loading && filteredEntries.length > 0 && (
                filters.viewMode === 'grid' ? (
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredEntries.map((entry) => (
                      <MarketplaceCard
                        key={entry.slug}
                        entry={entry}
                        onPress={() => handleEntryClick(entry)}
                        usingFallback={usingFallback}
                      />
                    ))}
                  </div>
                ) : (
                  <MarketplaceTable
                    entries={filteredEntries}
                    onEntryClick={handleEntryClick}
                    usingFallback={usingFallback}
                  />
                )
              )}

              {/* Empty */}
              {!loading && filteredEntries.length === 0 && (
                <EmptyState
                  message={filters.search ? 'No results match your search.' : 'No entries found.'}
                />
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
