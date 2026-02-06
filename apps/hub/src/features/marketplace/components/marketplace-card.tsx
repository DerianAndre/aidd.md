import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { truncate } from '../../../lib/utils';
import { formatInstallCount } from '../lib/catalog-helpers';
import type { MarketplaceEntry } from '../lib/types';

export interface MarketplaceCardProps {
  entry: MarketplaceEntry;
  onPress: () => void;
  usingFallback?: boolean;
}

export function MarketplaceCard({ entry, onPress, usingFallback }: MarketplaceCardProps) {
  const categoryLabel = entry.type === 'mcp-server'
    ? entry.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : entry.contentType.charAt(0).toUpperCase() + entry.contentType.slice(1);

  return (
    <Card
      onClick={onPress}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPress();
        }
      }}
      className="border border-border bg-muted/50 transition-colors hover:border-primary cursor-pointer"
    >
      <CardHeader className="flex-col items-start gap-1">
        <div className="flex w-full items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{entry.name}</CardTitle>
          <div className="flex gap-1">
            <Chip size="sm" color="default">
              {categoryLabel}
            </Chip>
            {entry.official && (
              <Chip size="sm" color="success">
                Official
              </Chip>
            )}
            {entry.trending && (
              <Chip size="sm" color="accent">
                Trending
              </Chip>
            )}
          </div>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          {truncate(entry.description, 100)}
        </CardDescription>
      </CardHeader>
      <CardFooter className="pt-0 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{entry.author}</span>
        {!usingFallback && entry.installCount > 0 && (
          <span className="text-[10px] font-medium text-muted-foreground">
            {formatInstallCount(entry.installCount)} installs
          </span>
        )}
      </CardFooter>
    </Card>
  );
}
