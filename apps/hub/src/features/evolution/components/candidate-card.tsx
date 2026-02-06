import { Card, Chip } from '@heroui/react';
import { ConfidenceMeter } from './confidence-meter';
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
}

export function CandidateCard({ candidate }: CandidateCardProps) {
  return (
    <Card className="border border-default-200 bg-default-50">
      <Card.Header>
        <div className="flex w-full items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Chip size="sm" variant="soft" color={TYPE_COLORS[candidate.type]}>
                {candidate.type.replace(/_/g, ' ')}
              </Chip>
              <span className="text-sm font-medium text-foreground">{candidate.title}</span>
            </div>
            <p className="text-xs text-default-500">{candidate.description}</p>
          </div>
          <ConfidenceMeter value={candidate.confidence} />
        </div>
      </Card.Header>
      <Card.Content className="pt-0">
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-default-400">
          <span>{candidate.sessionCount} session{candidate.sessionCount !== 1 ? 's' : ''}</span>
          <span>{candidate.evidence.length} evidence</span>
          <span>{candidate.discoveryTokensTotal.toLocaleString()} tokens</span>
          <span>Created {formatDate(candidate.createdAt)}</span>
        </div>
        {candidate.suggestedAction && (
          <p className="mt-2 text-xs text-default-500">
            <span className="font-medium text-foreground">Suggested:</span> {candidate.suggestedAction}
          </p>
        )}
      </Card.Content>
    </Card>
  );
}
