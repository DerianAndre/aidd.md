import { Card, Chip } from '@heroui/react';
import { formatRelativeTime, formatDuration, truncate } from '../../../lib/utils';
import type { SessionState } from '../../../lib/types';

interface SessionCardProps {
  session: SessionState;
  onPress?: () => void;
}

function outcomeChip(session: SessionState) {
  if (!session.endedAt) {
    return <Chip size="sm" variant="soft" color="accent">Active</Chip>;
  }
  if (session.outcome?.testsPassing) {
    return <Chip size="sm" variant="soft" color="success">Passed</Chip>;
  }
  if (session.outcome && !session.outcome.testsPassing) {
    return <Chip size="sm" variant="soft" color="danger">Failed</Chip>;
  }
  return <Chip size="sm" variant="soft" color="default">Completed</Chip>;
}

export function SessionCard({ session, onPress }: SessionCardProps) {
  const duration = session.endedAt
    ? formatDuration(new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime())
    : 'In progress';

  const modelLabel = session.aiProvider.model.replace('claude-', '').replace(/-\d{8}$/, '');

  return (
    <Card
      onClick={onPress}
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
      onKeyDown={onPress ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPress(); } } : undefined}
      className={`border border-default-200 bg-default-50 transition-colors hover:border-primary-300 ${onPress ? 'cursor-pointer' : ''}`}
    >
      <Card.Header className="flex-col items-start gap-1">
        <div className="flex w-full items-center justify-between gap-2">
          <Card.Title className="text-sm font-semibold">
            {truncate(session.branch, 30)}
          </Card.Title>
          {outcomeChip(session)}
        </div>
        <Card.Description className="text-xs text-default-500">
          {modelLabel} · {duration} · {session.tasksCompleted.length} tasks
        </Card.Description>
      </Card.Header>
      <Card.Footer className="flex items-center justify-between pt-0">
        <Chip size="sm" variant="soft" color="default">{session.taskClassification?.domain ?? 'unknown'}</Chip>
        <span className="text-[10px] text-default-400">{formatRelativeTime(session.startedAt)}</span>
      </Card.Footer>
    </Card>
  );
}
