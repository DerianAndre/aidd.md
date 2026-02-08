import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Pencil, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ConfidenceMeter } from '../../evolution/components/confidence-meter';
import { ConfirmDialog } from '../../../components/confirm-dialog';
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
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string, reason: string) => Promise<void>;
  onEdit?: (draft: DraftEntry) => void;
  onDelete?: (id: string) => void;
}

export function DraftCard({ draft, selected, onSelect, onApprove, onReject, onEdit, onDelete }: DraftCardProps) {
  const { t } = useTranslation();
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const isPending = draft.status === 'pending';

  return (
    <>
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
            <div className="flex items-center gap-1">
              <ConfidenceMeter value={draft.confidence} />
              {onEdit && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(draft); }}>
                  <Pencil size={14} />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(draft.id); }}>
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
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
          {isPending && (onApprove || onReject) && (
            <div className="mt-3 flex items-center gap-2">
              {onApprove && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-emerald-600 border-emerald-600/30 hover:bg-emerald-600/10"
                  onClick={(e) => { e.stopPropagation(); setConfirmApprove(true); }}
                >
                  <Check size={14} /> {t('page.drafts.approve')}
                </Button>
              )}
              {onReject && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); setConfirmReject(true); }}
                >
                  <X size={14} /> {t('page.drafts.reject')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve confirmation */}
      <ConfirmDialog
        open={confirmApprove}
        onOpenChange={setConfirmApprove}
        title={t('page.drafts.approveTitle')}
        description={t('page.drafts.approveDescription', { title: draft.title })}
        confirmLabel={t('page.drafts.approve')}
        onConfirm={async () => { await onApprove?.(draft.id); }}
      />

      {/* Reject confirmation with reason */}
      <ConfirmDialog
        open={confirmReject}
        onOpenChange={(open) => {
          setConfirmReject(open);
          if (!open) setRejectReason('');
        }}
        title={t('page.drafts.rejectTitle')}
        description={t('page.drafts.rejectDescription', { title: draft.title })}
        confirmLabel={t('page.drafts.reject')}
        variant="destructive"
        onConfirm={async () => { await onReject?.(draft.id, rejectReason.trim() || 'No reason provided'); }}
      >
        <div className="px-6 pb-2">
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t('page.drafts.rejectReasonPlaceholder')}
            rows={2}
          />
        </div>
      </ConfirmDialog>
    </>
  );
}
