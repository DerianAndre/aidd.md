import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Pencil, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ConfidenceMeter } from './confidence-meter';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { formatDate } from '../../../lib/utils';
import type { EvolutionCandidate, EvolutionType } from '../../../lib/types';

const TYPE_COLORS: Record<EvolutionType, 'accent' | 'success' | 'warning' | 'danger' | 'default'> = {
  routing_weight: 'accent',
  skill_combo: 'success',
  rule_elevation: 'warning',
  compound_workflow: 'accent',
  tkb_promotion: 'success',
  new_convention: 'default',
  model_recommendation: 'warning',
};

interface CandidateCardProps {
  candidate: EvolutionCandidate;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string, reason: string) => Promise<void>;
  onEdit?: (candidate: EvolutionCandidate) => void;
  onDelete?: (id: string) => void;
}

export function CandidateCard({ candidate, onApprove, onReject, onEdit, onDelete }: CandidateCardProps) {
  const { t } = useTranslation();
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  return (
    <>
      <Card className="border border-border bg-muted/50">
        <CardHeader>
          <div className="flex w-full items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Chip size="sm" color={TYPE_COLORS[candidate.type]}>
                  {candidate.type.replace(/_/g, ' ')}
                </Chip>
                <span className="text-sm font-medium text-foreground">{candidate.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{candidate.description}</p>
            </div>
            <div className="flex items-center gap-1">
              <ConfidenceMeter value={candidate.confidence} />
              {onEdit && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(candidate)}>
                  <Pencil size={14} />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(candidate.id)}>
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
            <span>{candidate.sessionCount} session{candidate.sessionCount !== 1 ? 's' : ''}</span>
            <span>{candidate.evidence.length} evidence</span>
            {candidate.discoveryTokensTotal > 0 && (
              <span>{candidate.discoveryTokensTotal.toLocaleString()} tokens</span>
            )}
            <span>Created {formatDate(candidate.createdAt)}</span>
          </div>
          {candidate.suggestedAction && (
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Suggested:</span> {candidate.suggestedAction}
            </p>
          )}
          {(onApprove || onReject) && (
            <div className="mt-3 flex items-center gap-2">
              {onApprove && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-emerald-600 border-emerald-600/30 hover:bg-emerald-600/10"
                  onClick={() => setConfirmApprove(true)}
                >
                  <Check size={14} /> {t('page.evolution.approve')}
                </Button>
              )}
              {onReject && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setConfirmReject(true)}
                >
                  <X size={14} /> {t('page.evolution.reject')}
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
        title={t('page.evolution.approveTitle')}
        description={t('page.evolution.approveDescription', { title: candidate.title })}
        confirmLabel={t('page.evolution.approve')}
        onConfirm={async () => { await onApprove?.(candidate.id); }}
      />

      {/* Reject confirmation with reason */}
      <ConfirmDialog
        open={confirmReject}
        onOpenChange={(open) => {
          setConfirmReject(open);
          if (!open) setRejectReason('');
        }}
        title={t('page.evolution.rejectTitle')}
        description={t('page.evolution.rejectDescription', { title: candidate.title })}
        confirmLabel={t('page.evolution.reject')}
        variant="destructive"
        onConfirm={async () => { await onReject?.(candidate.id, rejectReason.trim() || 'No reason provided'); }}
      >
        <div className="px-6 pb-2">
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t('page.evolution.rejectReasonPlaceholder')}
            rows={2}
          />
        </div>
      </ConfirmDialog>
    </>
  );
}
