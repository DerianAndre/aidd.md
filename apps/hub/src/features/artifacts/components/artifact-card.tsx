import { Archive, Trash2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import type { ArtifactEntry } from '@/lib/types';
import { TYPE_COLORS } from '../lib/parse-artifact';

interface ArtifactCardProps {
  artifact: ArtifactEntry;
  onClick: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

export function ArtifactCard({ artifact, onClick, onArchive, onDelete }: ArtifactCardProps) {
  const color = TYPE_COLORS[artifact.type] as
    | 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

  return (
    <Card
      className="group cursor-pointer transition-colors hover:bg-muted/50"
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
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Chip size="sm" color={color}>
              {artifact.type}
            </Chip>
            <span className="truncate text-sm font-medium">{artifact.title}</span>
          </div>
          {(onArchive || onDelete) && (
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {onArchive && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => { e.stopPropagation(); onArchive(); }}
                >
                  <Archive size={14} />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          )}
        </div>
        {artifact.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {artifact.description}
          </p>
        )}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{artifact.date}</span>
          {artifact.createdAt && (
            <>
              <span>&middot;</span>
              <span>{artifact.feature}</span>
            </>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
