import { useTranslation } from 'react-i18next';
import { LayoutGrid, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Label } from '@/components/ui/label';
import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { MCP_CATEGORIES, SORT_OPTIONS } from '../lib/constants';
import type {
  MarketplaceFilters,
  SortOption,
  ViewMode,
  McpCategory,
} from '../lib/types';
import { cn } from '../../../lib/utils';

export interface FilterBarProps {
  filters: MarketplaceFilters;
  resultCount: number;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: SortOption) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onCategoryToggle: (cat: McpCategory) => void;
  onOfficialToggle: () => void;
  onTrendingToggle: () => void;
  onClearFilters: () => void;
}

export function FilterBar({
  filters,
  resultCount,
  onSearchChange,
  onSortChange,
  onViewModeChange,
  onCategoryToggle,
  onOfficialToggle,
  onTrendingToggle,
  onClearFilters,
}: FilterBarProps) {
  const { t } = useTranslation();
  const hasActiveFilters =
    filters.mcpCategories.length > 0 ||
    filters.onlyOfficial ||
    filters.onlyTrending;

  const isMcpTab = filters.tab === 'mcp-servers';

  return (
    <div className="space-y-3">
      {/* Row 1: Search + Sort + View + Count */}
      <div className="flex items-center gap-3">
        <SearchInput
          value={filters.search}
          onChange={onSearchChange}
          placeholder={t('page.marketplace.searchPlaceholder')}
          className="max-w-xs"
        />

        <div>
          <Label className="sr-only">{t('page.marketplace.sortBy')}</Label>
          <Select value={filters.sort} onValueChange={(value) => onSortChange(value as SortOption)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'rounded p-1.5 transition-colors',
              filters.viewMode === 'grid'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
            aria-label={t('page.marketplace.gridView')}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={cn(
              'rounded p-1.5 transition-colors',
              filters.viewMode === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
            aria-label={t('page.marketplace.listView')}
          >
            <List size={16} />
          </button>
        </div>

        <span className="text-xs text-muted-foreground">
          {resultCount === 1 ? t('page.marketplace.resultCount', { count: resultCount }) : t('page.marketplace.resultCountPlural', { count: resultCount })}
        </span>
      </div>

      {/* Row 2: Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {isMcpTab && MCP_CATEGORIES.map((cat) => (
          <Chip
            key={cat.value}
            size="sm"
            color={filters.mcpCategories.includes(cat.value) ? 'accent' : 'default'}
            onClick={() => onCategoryToggle(cat.value)}
            className="cursor-pointer transition-colors hover:opacity-80"
          >
            {cat.label}
          </Chip>
        ))}

        <Chip
          size="sm"
          color={filters.onlyOfficial ? 'success' : 'default'}
          onClick={onOfficialToggle}
          className="cursor-pointer transition-colors hover:opacity-80"
        >
          {t('common.official')}
        </Chip>

        <Chip
          size="sm"
          color={filters.onlyTrending ? 'accent' : 'default'}
          onClick={onTrendingToggle}
          className="cursor-pointer transition-colors hover:opacity-80"
        >
          {t('common.trending')}
        </Chip>

        {hasActiveFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearFilters}
            className="ml-2"
          >
            <X size={14} /> {t('page.marketplace.clearFilters')}
          </Button>
        )}
      </div>
    </div>
  );
}
