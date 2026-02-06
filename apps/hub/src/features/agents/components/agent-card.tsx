import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import type { AgentEntry } from '../lib/parse-agents';
import { truncate } from '../../../lib/utils';

interface AgentCardProps {
  agent: AgentEntry;
  onPress: () => void;
}

export function AgentCard({ agent, onPress }: AgentCardProps) {
  return (
    <Card
      onClick={onPress}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPress(); }
      }}
      className="cursor-pointer border border-border bg-muted/50 transition-colors hover:border-primary"
    >
      <CardHeader className="flex-col items-start gap-1">
        <div className="flex w-full items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">
            <span className="mr-1.5">{agent.emoji}</span>
            {agent.name}
          </CardTitle>
          <Chip
            size="sm"
            color={agent.type === 'orchestrator' ? 'accent' : 'default'}
          >
            {agent.type === 'orchestrator' ? 'Orchestrator' : 'Agent'}
          </Chip>
        </div>
        {agent.purpose && (
          <CardDescription className="text-xs text-muted-foreground">
            {truncate(agent.purpose, 120)}
          </CardDescription>
        )}
      </CardHeader>
      {(agent.skills ?? agent.activation ?? agent.complexity) && (
        <CardFooter className="flex gap-2 pt-0">
          {agent.skills && (
            <span className="text-[10px] text-muted-foreground">{agent.skills}</span>
          )}
          {agent.complexity && (
            <Chip size="sm" color="warning">{agent.complexity}</Chip>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
