import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { getAllTools } from '../lib/mcp-catalog';
import { ToolDetail } from './tool-detail';
import type { McpToolInfo } from '../lib/mcp-catalog';

interface ToolExplorerProps {
  tools?: (McpToolInfo & { packageName: string })[];
  loading?: boolean;
  error?: string | null;
}

export function ToolExplorer({ tools, loading = false, error = null }: ToolExplorerProps) {
  const allTools = useMemo(() => tools ?? getAllTools(), [tools]);
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(24);

  const filtered = useMemo(() => {
    if (!query.trim()) return allTools;
    const q = query.toLowerCase();
    return allTools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.packageName.toLowerCase().includes(q),
    );
  }, [allTools, query]);

  useEffect(() => {
    setVisibleCount(24);
  }, [query, allTools.length]);

  const visibleTools = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  // Group by package
  const grouped = useMemo(() => {
    const map = new Map<string, typeof visibleTools>();
    for (const tool of visibleTools) {
      const list = map.get(tool.packageName) ?? [];
      list.push(tool);
      map.set(tool.packageName, list);
    }
    return map;
  }, [visibleTools]);

  const remaining = Math.max(0, filtered.length - visibleTools.length);

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning-foreground">
          {error}
        </p>
      )}

      {/* Search */}
      <div>
        <Label className="sr-only">Search tools</Label>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools by name, description, or package..."
            className="pl-8 text-sm"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} tool{filtered.length !== 1 ? 's' : ''} found
        {query.trim() ? ` for "${query.trim()}"` : ''}
      </p>

      {/* Grouped results */}
      {!loading && [...grouped.entries()].map(([pkgName, tools]) => (
        <div key={pkgName}>
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{pkgName}</h3>
          <div className="space-y-3">
            {tools.map((tool) => (
              <ToolDetail key={tool.name} tool={tool} />
            ))}
          </div>
        </div>
      ))}

      {loading && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading tools...
        </p>
      )}

      {!loading && filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No tools match your search.
        </p>
      )}

      {!loading && remaining > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((count) => count + 24)}
          >
            Show 24 more ({remaining} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
