import { Clock, GitBranch, Pencil, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatRelativeTime, formatDuration, truncate } from '../../../lib/utils';
import type { SessionState } from '../../../lib/types';

interface SessionCardProps {
  session: SessionState;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: (id: string) => void;
}

function statusChip(session: SessionState) {
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
  const durationMs = session.endedAt
    ? new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()
    : Date.now() - new Date(session.startedAt).getTime();
  const duration = formatDuration(durationMs);

  const modelLabel = session.aiProvider.model.replace('claude-', '').replace(/-\d{8}$/, '');
  const isCompleted = !!session.endedAt;
  const hasName = !!session.input;

  // Primary title: session name (input) if available, else branch
  const title = hasName
    ? truncate(session.input!, 50)
    : truncate(session.branch, 40);

  return (
    <Card
      onClick={onPress}
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
      onKeyDown={onPress ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPress(); } } : undefined}
      className={`group border border-border bg-card transition-all duration-200 hover:border-primary/50 hover:shadow-sm ${onPress ? 'cursor-pointer' : ''}`}
    >
      <CardHeader className="flex-col items-start gap-1.5 pb-2">
        <div className="flex w-full items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm font-semibold leading-snug">
              {title}
            </CardTitle>
            {hasName && (
              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <GitBranch size={10} className="shrink-0" />
                <span className="truncate">{truncate(session.branch, 30)}</span>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {statusChip(session)}
            {onEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    aria-label="Edit session"
                  >
                    <Pencil size={13} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Edit</TooltipContent>
              </Tooltip>
            )}
            {isCompleted && onDelete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                    aria-label="Delete session"
                  >
                    <Trash2 size={13} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Delete</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        <CardDescription className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>{modelLabel}</span>
          <span className="text-border">·</span>
          <span className="flex items-center gap-0.5">
            <Clock size={10} />
            {duration}
          </span>
          {session.tasksCompleted.length > 0 && (
            <>
              <span className="text-border">·</span>
              <span>{session.tasksCompleted.length} tasks</span>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex items-center justify-between pt-0">
        <div className="flex items-center gap-1.5">
          {session.taskClassification?.domain && (
            <Chip size="sm" color="default">{session.taskClassification.domain}</Chip>
          )}
          {session.taskClassification?.nature && (
            <Chip size="sm" color="info">{session.taskClassification.nature}</Chip>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">{formatRelativeTime(session.startedAt)}</span>
      </CardFooter>
    </Card>
  );
}
