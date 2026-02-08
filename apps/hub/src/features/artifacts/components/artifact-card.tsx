import { Card, CardHeader } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import type { ArtifactEntry } from '@/lib/types';
import { TYPE_COLORS } from '../lib/parse-artifact';
import { formatRelativeTime } from '@/lib/utils';

interface ArtifactCardProps {
  artifact: ArtifactEntry;
  onClick: () => void;
}

export function ArtifactCard({ artifact, onClick }: ArtifactCardProps) {
  const color = TYPE_COLORS[artifact.type] as
    | 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      tabIndex={0}
      role="button"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardHeader className="gap-1 p-4">
        <div className="flex items-center gap-2">
          <Chip size="sm" color={color}>
            {artifact.type}
          </Chip>
          <span className="truncate text-sm font-medium">{artifact.title}</span>
        </div>
        {artifact.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {artifact.description}
          </p>
        )}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{artifact.date}</span>
          {artifact.lastModified && (
            <>
              <span>&middot;</span>
              <span>{formatRelativeTime(artifact.lastModified)}</span>
            </>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
