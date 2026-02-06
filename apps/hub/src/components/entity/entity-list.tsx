import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState } from 'react';
import { EmptyState } from '../empty-state';

export interface EntityListProps<T> {
  items: T[];
  loading: boolean;
  /** Key extractor for React keys. */
  getKey: (item: T) => string;
  /** Searchable text for filtering. */
  getSearchText: (item: T) => string;
  /** Render function for each item. */
  renderItem: (item: T) => React.ReactNode;
  /** Placeholder text for the search input. */
  searchPlaceholder?: string;
  /** Empty state message. */
  emptyMessage?: string;
  /** Optional header actions (e.g. "New" button). */
  actions?: React.ReactNode;
  /** Grid columns: 1, 2, or 3 (default 3). */
  columns?: 1 | 2 | 3;
}

const SKELETON_COUNT = 6;

const gridCols = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
} as const;

export function EntityList<T>({
  items,
  loading,
  getKey,
  getSearchText,
  renderItem,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No items found.',
  actions,
  columns = 3,
}: EntityListProps<T>) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => getSearchText(item).toLowerCase().includes(q));
  }, [items, search, getSearchText]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={searchPlaceholder}
          className="max-w-xs"
        />
        <span className="text-xs text-muted-foreground">
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </span>
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className={`grid gap-3 ${gridCols[columns]}`}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}

      {/* Items */}
      {!loading && filtered.length > 0 && (
        <div className={`grid gap-3 ${gridCols[columns]}`}>
          {filtered.map((item) => (
            <div key={getKey(item)}>{renderItem(item)}</div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          message={search ? 'No results match your search.' : emptyMessage}
        />
      )}
    </div>
  );
}
