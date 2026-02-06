import { Card, Chip } from '@heroui/react';
import { truncate } from '../../../lib/utils';
import { formatInstallCount } from '../lib/catalog-helpers';
import type { MarketplaceEntry } from '../lib/types';

export interface MarketplaceCardProps {
  entry: MarketplaceEntry;
  onPress: () => void;
}

export function MarketplaceCard({ entry, onPress }: MarketplaceCardProps) {
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
      className="border border-default-200 bg-default-50 transition-colors hover:border-primary-300 cursor-pointer"
    >
      <Card.Header className="flex-col items-start gap-1">
        <div className="flex w-full items-center justify-between gap-2">
          <Card.Title className="text-sm font-semibold">{entry.name}</Card.Title>
          <div className="flex gap-1">
            <Chip size="sm" variant="soft" color="default">
              {categoryLabel}
            </Chip>
            {entry.official && (
              <Chip size="sm" variant="soft" color="success">
                Official
              </Chip>
            )}
            {entry.trending && (
              <Chip size="sm" variant="soft" color="accent">
                Trending
              </Chip>
            )}
          </div>
        </div>
        <Card.Description className="text-xs text-default-500">
          {truncate(entry.description, 100)}
        </Card.Description>
      </Card.Header>
      <Card.Footer className="pt-0 flex items-center justify-between">
        <span className="text-[10px] text-default-400">{entry.author}</span>
        <span className="text-[10px] font-medium text-default-500">
          {formatInstallCount(entry.installCount)} installs
        </span>
      </Card.Footer>
    </Card>
  );
}
