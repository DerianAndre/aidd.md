import { formatInstallCount } from '../lib/catalog-helpers';
import type { MarketplaceEntry } from '../lib/types';

export interface MarketplaceTableProps {
  entries: MarketplaceEntry[];
  onEntryClick: (entry: MarketplaceEntry) => void;
  usingFallback?: boolean;
}

export function MarketplaceTable({ entries, onEntryClick, usingFallback }: MarketplaceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border">
          <tr className="text-left text-xs text-muted-foreground">
            <th className="pb-2 pl-3 pr-2 font-medium">#</th>
            <th className="pb-2 px-2 font-medium">Name</th>
            <th className="pb-2 px-2 font-medium">Author</th>
            <th className="pb-2 px-2 font-medium">Type</th>
            {!usingFallback && <th className="pb-2 pl-2 pr-3 font-medium text-right">Installs</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const typeLabel = entry.type === 'mcp-server'
              ? entry.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
              : entry.contentType.charAt(0).toUpperCase() + entry.contentType.slice(1);

            return (
              <tr
                key={entry.slug}
                onClick={() => onEntryClick(entry)}
                className="cursor-pointer border-b border-border transition-colors hover:bg-muted/50"
              >
                <td className="py-3 pl-3 pr-2 text-muted-foreground">
                  {index + 1}
                </td>
                <td className="py-3 px-2 font-medium text-foreground">
                  {entry.name}
                </td>
                <td className="py-3 px-2 text-muted-foreground">
                  {entry.author}
                </td>
                <td className="py-3 px-2 text-muted-foreground">
                  {typeLabel}
                </td>
                {!usingFallback && (
                  <td className="py-3 pl-2 pr-3 text-right text-muted-foreground">
                    {formatInstallCount(entry.installCount)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
