import { Server, FileText, Download, Tag } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
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
          <Chip size="sm" color="warning">
            Offline
          </Chip>
          <span className="text-xs text-muted-foreground">
            Showing fallback data
          </span>
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            <Server size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{stats.totalMcpServers}</p>
            <p className="text-[10px] text-muted-foreground">MCP Servers</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            <FileText size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{stats.totalContent}</p>
            <p className="text-[10px] text-muted-foreground">Content</p>
          </div>
        </div>

        {!usingFallback && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
            <div className="rounded-lg bg-muted p-2 text-muted-foreground">
              <Download size={18} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {formatInstallCount(stats.totalInstalls)}
              </p>
              <p className="text-[10px] text-muted-foreground">Total Installs</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            <Tag size={18} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{categoriesCount}</p>
            <p className="text-[10px] text-muted-foreground">Categories</p>
          </div>
        </div>
      </div>
    </div>
  );
}
