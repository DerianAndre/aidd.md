import { formatInstallCount } from '../lib/catalog-helpers';
import type { MarketplaceEntry } from '../lib/types';

export interface MarketplaceTableProps {
  entries: MarketplaceEntry[];
  onEntryClick: (entry: MarketplaceEntry) => void;
}

export function MarketplaceTable({ entries, onEntryClick }: MarketplaceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-default-200">
          <tr className="text-left text-xs text-default-400">
            <th className="pb-2 pl-3 pr-2 font-medium">#</th>
            <th className="pb-2 px-2 font-medium">Name</th>
            <th className="pb-2 px-2 font-medium">Author</th>
            <th className="pb-2 px-2 font-medium">Type</th>
            <th className="pb-2 pl-2 pr-3 font-medium text-right">Installs</th>
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
                className="cursor-pointer border-b border-default-100 transition-colors hover:bg-default-50"
              >
                <td className="py-3 pl-3 pr-2 text-default-400">
                  {index + 1}
                </td>
                <td className="py-3 px-2 font-medium text-foreground">
                  {entry.name}
                </td>
                <td className="py-3 px-2 text-default-500">
                  {entry.author}
                </td>
                <td className="py-3 px-2 text-default-500">
                  {typeLabel}
                </td>
                <td className="py-3 pl-2 pr-3 text-right text-default-500">
                  {formatInstallCount(entry.installCount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
