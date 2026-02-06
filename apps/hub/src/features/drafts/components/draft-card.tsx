import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ConfidenceMeter } from '../../evolution/components/confidence-meter';
import { formatDate } from '../../../lib/utils';
import type { DraftEntry, DraftStatus } from '../../../lib/types';

const STATUS_COLORS: Record<DraftStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

interface DraftCardProps {
  draft: DraftEntry;
  selected: boolean;
  onSelect: (draft: DraftEntry) => void;
}

export function DraftCard({ draft, selected, onSelect }: DraftCardProps) {
  return (
    <Card
      className={`border bg-muted/50 cursor-pointer transition-colors ${
        selected ? 'border-accent' : 'border-border hover:border-border'
      }`}
      onClick={() => onSelect(draft)}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(draft);
        }
      }}
    >
      <CardHeader>
        <div className="flex w-full items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">{draft.title}</span>
            <div className="flex items-center gap-2">
              <Chip size="sm" color="accent">{draft.category}</Chip>
              <Chip size="sm" color={STATUS_COLORS[draft.status]}>{draft.status}</Chip>
              <Chip size="sm" color="default">{draft.source}</Chip>
            </div>
          </div>
          <ConfidenceMeter value={draft.confidence} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>Created {formatDate(draft.createdAt)}</span>
          <span>Updated {formatDate(draft.updatedAt)}</span>
          {draft.approvedAt && <span>Approved {formatDate(draft.approvedAt)}</span>}
        </div>
        {draft.rejectedReason && (
          <p className="mt-1 text-xs text-danger">{draft.rejectedReason}</p>
        )}
      </CardContent>
    </Card>
  );
}
