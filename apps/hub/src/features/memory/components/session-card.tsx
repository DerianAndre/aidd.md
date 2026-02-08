import { Pencil, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { formatRelativeTime, formatDuration, truncate } from '../../../lib/utils';
import type { SessionState } from '../../../lib/types';

interface SessionCardProps {
  session: SessionState;
  onPress?: () => void;
  onEdit?: (session: SessionState) => void;
  onDelete?: (id: string) => void;
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

export function SessionCard({ session, onPress, onEdit, onDelete }: SessionCardProps) {
  const duration = session.endedAt
    ? formatDuration(new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime())
    : 'In progress';

  const modelLabel = session.aiProvider.model.replace('claude-', '').replace(/-\d{8}$/, '');
  const isCompleted = !!session.endedAt;

  return (
    <Card
      onClick={onPress}
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
      onKeyDown={onPress ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPress(); } } : undefined}
      className={`group border border-border bg-muted/50 transition-colors hover:border-primary ${onPress ? 'cursor-pointer' : ''}`}
    >
      <CardHeader className="flex-col items-start gap-1">
        <div className="flex w-full items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">
            {truncate(session.branch, 30)}
          </CardTitle>
          <div className="flex items-center gap-1">
            {outcomeChip(session)}
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); onEdit(session); }}
              >
                <Pencil size={14} />
              </Button>
            )}
            {isCompleted && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          {modelLabel} · {duration} · {session.tasksCompleted.length} tasks
        </CardDescription>
        {session.input && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80 italic">
            {truncate(session.input, 120)}
          </p>
        )}
      </CardHeader>
      <CardFooter className="flex items-center justify-between pt-0">
        <Chip size="sm" color="default">{session.taskClassification?.domain ?? 'unknown'}</Chip>
        <span className="text-[10px] text-muted-foreground">{formatRelativeTime(session.startedAt)}</span>
      </CardFooter>
    </Card>
  );
}
