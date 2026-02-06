import { SearchField, Select, ListBox, Label, Button, Chip } from '@heroui/react';
import { LayoutGrid, List, X } from 'lucide-react';
import type { Key } from 'react';
import { MCP_CATEGORIES, CONTENT_TYPES, SORT_OPTIONS } from '../lib/constants';
import type {
  MarketplaceFilters,
  SortOption,
  ViewMode,
  McpCategory,
  ContentType,
} from '../lib/types';
import { cn } from '../../../lib/utils';

export interface FilterBarProps {
  filters: MarketplaceFilters;
  resultCount: number;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: SortOption) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onCategoryToggle: (cat: McpCategory) => void;
  onContentTypeToggle: (ct: ContentType) => void;
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
  onContentTypeToggle,
  onOfficialToggle,
  onTrendingToggle,
  onClearFilters,
}: FilterBarProps) {
  const hasActiveFilters =
    filters.mcpCategories.length > 0 ||
    filters.contentTypes.length > 0 ||
    filters.onlyOfficial ||
    filters.onlyTrending;

  const isMcpTab = filters.tab === 'mcp-servers';

  return (
    <div className="space-y-3">
      {/* Row 1: Search + Sort + View + Count */}
      <div className="flex items-center gap-3">
        <SearchField
          aria-label="Search marketplace"
          value={filters.search}
          onChange={onSearchChange}
          className="max-w-xs"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search..." />
            {filters.search && <SearchField.ClearButton />}
          </SearchField.Group>
        </SearchField>

        <Select
          value={filters.sort}
          onChange={(value: Key | null) => {
            if (value) onSortChange(value as SortOption);
          }}
        >
          <Label className="sr-only">Sort by</Label>
          <Select.Trigger className="w-40">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {SORT_OPTIONS.map((opt) => (
                <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label}>
                  {opt.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <div className="flex items-center gap-1 rounded-lg border border-default-200 bg-default-50 p-1">
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'rounded p-1.5 transition-colors',
              filters.viewMode === 'grid'
                ? 'bg-primary text-primary-foreground'
                : 'text-default-500 hover:bg-default-100 hover:text-foreground'
            )}
            aria-label="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={cn(
              'rounded p-1.5 transition-colors',
              filters.viewMode === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'text-default-500 hover:bg-default-100 hover:text-foreground'
            )}
            aria-label="List view"
          >
            <List size={16} />
          </button>
        </div>

        <span className="text-xs text-default-400">
          {resultCount} result{resultCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Row 2: Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {isMcpTab
          ? MCP_CATEGORIES.map((cat) => (
              <Chip
                key={cat.value}
                size="sm"
                variant="soft"
                color={filters.mcpCategories.includes(cat.value) ? 'accent' : 'default'}
                onClick={() => onCategoryToggle(cat.value)}
                className="cursor-pointer transition-colors hover:opacity-80"
              >
                {cat.label}
              </Chip>
            ))
          : CONTENT_TYPES.map((ct) => (
              <Chip
                key={ct.value}
                size="sm"
                variant="soft"
                color={filters.contentTypes.includes(ct.value) ? 'accent' : 'default'}
                onClick={() => onContentTypeToggle(ct.value)}
                className="cursor-pointer transition-colors hover:opacity-80"
              >
                {ct.label}
              </Chip>
            ))}

        <Chip
          size="sm"
          variant="soft"
          color={filters.onlyOfficial ? 'success' : 'default'}
          onClick={onOfficialToggle}
          className="cursor-pointer transition-colors hover:opacity-80"
        >
          Official
        </Chip>

        <Chip
          size="sm"
          variant="soft"
          color={filters.onlyTrending ? 'accent' : 'default'}
          onClick={onTrendingToggle}
          className="cursor-pointer transition-colors hover:opacity-80"
        >
          Trending
        </Chip>

        {hasActiveFilters && (
          <Button
            size="sm"
            variant="ghost"
            onPress={onClearFilters}
            className="ml-2"
          >
            <X size={14} /> Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
