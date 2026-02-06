import { Card, Chip } from '@heroui/react';
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
      className="cursor-pointer border border-default-200 bg-default-50 transition-colors hover:border-primary-300"
    >
      <Card.Header className="flex-col items-start gap-1">
        <div className="flex w-full items-center justify-between gap-2">
          <Card.Title className="text-sm font-semibold">
            <span className="mr-1.5">{agent.emoji}</span>
            {agent.name}
          </Card.Title>
          <Chip
            size="sm"
            variant="soft"
            color={agent.type === 'orchestrator' ? 'accent' : 'default'}
          >
            {agent.type === 'orchestrator' ? 'Orchestrator' : 'Agent'}
          </Chip>
        </div>
        {agent.purpose && (
          <Card.Description className="text-xs text-default-500">
            {truncate(agent.purpose, 120)}
          </Card.Description>
        )}
      </Card.Header>
      {(agent.skills ?? agent.activation ?? agent.complexity) && (
        <Card.Footer className="flex gap-2 pt-0">
          {agent.skills && (
            <span className="text-[10px] text-default-400">{agent.skills}</span>
          )}
          {agent.complexity && (
            <Chip size="sm" variant="soft" color="warning">{agent.complexity}</Chip>
          )}
        </Card.Footer>
      )}
    </Card>
  );
}
