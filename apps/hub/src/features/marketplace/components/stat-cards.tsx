import { Server, FileText, Download, Tag } from 'lucide-react';
import { Chip } from '@heroui/react';
import { formatInstallCount } from '../lib/catalog-helpers';
import type { MarketplaceStats } from '../lib/types';

export interface StatCardsProps {
  stats: MarketplaceStats;
  usingFallback: boolean;
}

export function StatCards({ stats, usingFallback }: StatCardsProps) {
  const categoriesCount = Object.keys(stats.categoryCounts).length;

  return (
    <div className="mb-6">
      {usingFallback && (
        <div className="mb-3 flex items-center gap-2">
          <Chip size="sm" variant="soft" color="warning">
            Offline
          </Chip>
          <span className="text-xs text-default-400">
            Showing fallback data
          </span>
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50 p-3">
          <div className="rounded-lg bg-default-100 p-2 text-default-500">
            <Server size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{stats.totalMcpServers}</p>
            <p className="text-[10px] text-default-400">MCP Servers</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50 p-3">
          <div className="rounded-lg bg-default-100 p-2 text-default-500">
            <FileText size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{stats.totalContent}</p>
            <p className="text-[10px] text-default-400">Content</p>
          </div>
        </div>

        {!usingFallback && (
          <div className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50 p-3">
            <div className="rounded-lg bg-default-100 p-2 text-default-500">
              <Download size={18} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {formatInstallCount(stats.totalInstalls)}
              </p>
              <p className="text-[10px] text-default-400">Total Installs</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-xl border border-default-200 bg-default-50 p-3">
          <div className="rounded-lg bg-default-100 p-2 text-default-500">
            <Tag size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{categoriesCount}</p>
            <p className="text-[10px] text-default-400">Categories</p>
          </div>
        </div>
      </div>
    </div>
  );
}
