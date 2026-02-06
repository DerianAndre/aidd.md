import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { formatRelativeTime, formatDuration, truncate } from '../../../lib/utils';
import type { SessionState } from '../../../lib/types';

interface SessionCardProps {
  session: SessionState;
  onPress?: () => void;
}

function outcomeChip(session: SessionState) {
  if (!session.endedAt) {
    return <Chip size="sm" color="accent">Active</Chip>;
  }
  if (session.outcome?.testsPassing) {
    return <Chip size="sm" color="success">Passed</Chip>;
  }
  if (session.outcome && !session.outcome.testsPassing) {
    return <Chip size="sm" color="danger">Failed</Chip>;
  }
  return <Chip size="sm" color="default">Completed</Chip>;
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
      className={`border border-border bg-muted/50 transition-colors hover:border-primary ${onPress ? 'cursor-pointer' : ''}`}
    >
      <CardHeader className="flex-col items-start gap-1">
        <div className="flex w-full items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">
            {truncate(session.branch, 30)}
          </CardTitle>
          {outcomeChip(session)}
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          {modelLabel} · {duration} · {session.tasksCompleted.length} tasks
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex items-center justify-between pt-0">
        <Chip size="sm" color="default">{session.taskClassification?.domain ?? 'unknown'}</Chip>
        <span className="text-[10px] text-muted-foreground">{formatRelativeTime(session.startedAt)}</span>
      </CardFooter>
    </Card>
  );
}
