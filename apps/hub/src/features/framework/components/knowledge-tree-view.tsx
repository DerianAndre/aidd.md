import { useState, useMemo } from 'react';
import { Chip } from '@heroui/react';
import { ChevronRight, Folder, FileText, Search } from 'lucide-react';
import type { FrameworkEntity } from '../../../lib/tauri';

interface KnowledgeGroup {
  name: string;
  entries: { entity: FrameworkEntity; label: string }[];
}

interface KnowledgeTreeViewProps {
  entities: FrameworkEntity[];
  onEntityClick: (name: string) => void;
}

/** Group knowledge entities by first path segment and render as collapsible sections. */
export function KnowledgeTreeView({ entities, onEntityClick }: KnowledgeTreeViewProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');

  const groups = useMemo(() => {
    const map = new Map<string, KnowledgeGroup>();

    for (const entity of entities) {
      const slashIdx = entity.name.indexOf('/');
      const groupName = slashIdx > 0 ? entity.name.slice(0, slashIdx) : '_ungrouped';
      const label = slashIdx > 0 ? entity.name.slice(slashIdx + 1) : entity.name;

      if (!map.has(groupName)) {
        map.set(groupName, { name: groupName, entries: [] });
      }
      map.get(groupName)!.entries.push({ entity, label });
    }

    // Sort groups alphabetically, _ungrouped last
    const sorted = Array.from(map.values()).sort((a, b) => {
      if (a.name === '_ungrouped') return 1;
      if (b.name === '_ungrouped') return -1;
      return a.name.localeCompare(b.name);
    });

    // Sort entries within each group
    for (const group of sorted) {
      group.entries.sort((a, b) => a.label.localeCompare(b.label));
    }

    return sorted;
  }, [entities]);

  // Filter groups/entries by search term
  const filtered = useMemo(() => {
    if (!filter.trim()) return groups;

    const q = filter.toLowerCase();
    return groups
      .map((group) => ({
        ...group,
        entries: group.entries.filter(
          (e) =>
            e.label.toLowerCase().includes(q) ||
            group.name.toLowerCase().includes(q) ||
            (e.entity.content && e.entity.content.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.entries.length > 0);
  }, [groups, filter]);

  const toggleGroup = (name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    for (const g of filtered) all[g.name] = true;
    setExpanded(all);
  };

  const collapseAll = () => setExpanded({});

  // Default: all groups expanded when no filter, matching groups expanded when filtering
  const isExpanded = (name: string) => {
    if (filter.trim()) return true; // Always expanded when filtering
    return expanded[name] ?? true; // Default expanded
  };

  return (
    <div className="space-y-3">
      {/* Search + controls */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-default-400" />
          <input
            type="text"
            placeholder="Filter knowledge entries..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-lg border border-default-200 bg-default-50 py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-default-400 outline-none focus:border-primary"
          />
        </div>
        <button
          type="button"
          className="text-xs text-default-400 hover:text-foreground transition-colors whitespace-nowrap"
          onClick={expandAll}
        >
          Expand all
        </button>
        <span className="text-default-300">|</span>
        <button
          type="button"
          className="text-xs text-default-400 hover:text-foreground transition-colors whitespace-nowrap"
          onClick={collapseAll}
        >
          Collapse all
        </button>
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-8 text-default-400">
          <Search size={32} className="mb-2" />
          <p className="text-sm">No entries match &quot;{filter}&quot;</p>
        </div>
      )}

      {/* Groups */}
      {filtered.map((group) => {
        const open = isExpanded(group.name);
        return (
          <div key={group.name} className="rounded-lg border border-default-200 overflow-hidden">
            {/* Group header */}
            <button
              type="button"
              className="flex w-full items-center gap-2 bg-default-100 px-4 py-2.5 text-left transition-colors hover:bg-default-200"
              onClick={() => toggleGroup(group.name)}
            >
              <ChevronRight
                size={14}
                className={`text-default-400 transition-transform ${open ? 'rotate-90' : ''}`}
              />
              <Folder size={14} className="text-default-500" />
              <span className="text-sm font-medium capitalize text-foreground">
                {group.name === '_ungrouped' ? 'Other' : group.name}
              </span>
              <Chip size="sm" variant="soft">
                {group.entries.length}
              </Chip>
            </button>

            {/* Entries */}
            {open && (
              <div className="divide-y divide-default-100">
                {group.entries.map(({ entity, label }) => (
                  <button
                    key={`${entity.source}-${entity.name}`}
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-default-50"
                    onClick={() => onEntityClick(entity.name)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={13} className="shrink-0 text-default-400" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{label}</p>
                        {entity.content && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-default-400">
                            {entity.content.slice(0, 100)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Chip
                      size="sm"
                      variant="soft"
                      color={entity.source === 'project' ? 'accent' : 'default'}
                      className="shrink-0 ml-2"
                    >
                      {entity.source}
                    </Chip>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
