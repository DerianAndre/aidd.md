import { useState } from 'react';
import { Card, Chip } from '@heroui/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatRelativeTime } from '../../../lib/utils';
import type { SessionObservation, ObservationType } from '../../../lib/types';

const TYPE_COLORS: Record<ObservationType, 'accent' | 'success' | 'warning' | 'danger' | 'default'> = {
  decision: 'accent',
  mistake: 'danger',
  convention: 'success',
  pattern: 'default',
  preference: 'default',
  insight: 'accent',
  tool_outcome: 'warning',
  workflow_outcome: 'success',
};

interface ObservationCardProps {
  observation: SessionObservation;
}

export function ObservationCard({ observation }: ObservationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = observation.narrative || (observation.facts && observation.facts.length > 0);

  return (
    <Card className="border border-default-200 bg-default-50">
      <Card.Header
        className="cursor-pointer gap-2"
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <div className="flex w-full items-start gap-2">
          {hasDetails && (
            <span className="mt-0.5 text-default-400">
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Chip size="sm" variant="soft" color={TYPE_COLORS[observation.type]}>
                {observation.type.replace('_', ' ')}
              </Chip>
              <span className="text-xs text-default-400">{formatRelativeTime(observation.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">{observation.title}</p>
          </div>
        </div>
      </Card.Header>

      {expanded && hasDetails && (
        <Card.Content className="pt-0">
          {observation.facts && observation.facts.length > 0 && (
            <ul className="mb-2 list-inside list-disc text-xs text-default-500">
              {observation.facts.map((fact, i) => (
                <li key={i}>{fact}</li>
              ))}
            </ul>
          )}

          {observation.narrative && (
            <p className="mb-2 text-xs text-default-500">{observation.narrative}</p>
          )}

          {observation.concepts && observation.concepts.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {observation.concepts.map((c) => (
                <Chip key={c} size="sm" variant="soft" color="default">{c}</Chip>
              ))}
            </div>
          )}
        </Card.Content>
      )}
    </Card>
  );
}
