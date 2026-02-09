import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { formatDate } from '@/lib/utils';
import type { ArtifactEntry } from '@/lib/types';

interface ArtifactPreviewCardProps {
  artifact: ArtifactEntry;
}

type ArtifactType = ArtifactEntry['type'];

const typeColorMap: Record<ArtifactType, NonNullable<React.ComponentProps<typeof Chip>['color']>> = {
  brainstorm: 'info',
  research: 'info',
  plan: 'primary',
  adr: 'accent',
  diagram: 'default',
  issue: 'warning',
  spec: 'primary',
  checklist: 'success',
  retro: 'default',
};

export function ArtifactPreviewCard({ artifact }: ArtifactPreviewCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => navigate(`/artifacts/${artifact.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/artifacts/${artifact.id}`);
        }
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Chip size="sm" color={typeColorMap[artifact.type]}>
            {artifact.type}
          </Chip>
          <Chip
            size="sm"
            color={artifact.status === 'active' ? 'accent' : 'default'}
          >
            {artifact.status}
          </Chip>
        </div>
        <CardTitle className="text-sm mt-2 line-clamp-2">
          {artifact.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground line-clamp-3">
          {artifact.description || artifact.content.slice(0, 150) + '...'}
        </p>
        <p className="text-[10px] text-muted-foreground mt-2">
          {formatDate(artifact.createdAt)}
        </p>
      </CardContent>
    </Card>
  );
}
