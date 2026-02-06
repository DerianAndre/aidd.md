import { useState } from 'react';
import { Card, Chip, Button } from '@heroui/react';
import { ChevronDown, ChevronUp, Wrench, BookOpen, MessageSquare } from 'lucide-react';
import type { McpPackageInfo } from '../lib/mcp-catalog';
import type { McpPackageStatus } from '../stores/mcp-servers-store';

const ROLE_COLORS: Record<string, 'accent' | 'success' | 'warning' | 'danger' | 'default'> = {
  'The Brain': 'accent',
  'The Memory': 'success',
  'The Hands': 'warning',
  'Monolithic': 'default',
  'Foundation': 'default',
};

interface PackageCardProps {
  info: McpPackageInfo;
  status?: McpPackageStatus;
}

export function PackageCard({ info, status }: PackageCardProps) {
  const [expanded, setExpanded] = useState(false);
  const toolCount = info.tools.length;
  const resourceCount = info.resources.length;
  const promptCount = info.prompts.length;
  const totalItems = toolCount + resourceCount + promptCount;

  return (
    <Card className="border border-default-200 bg-default-50">
      <Card.Header className="flex-row items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {/* Build status dot */}
            {status && (
              <span
                className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${status.built ? 'bg-success' : 'bg-danger'}`}
                title={status.built ? 'Built' : 'Not built'}
              />
            )}
            <Card.Title className="truncate text-sm">{info.name}</Card.Title>
          </div>
          <Card.Description className="mt-0.5">{info.description}</Card.Description>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Chip size="sm" variant="soft" color={ROLE_COLORS[info.role] ?? 'default'}>
            {info.role}
          </Chip>
          {status && (
            <Chip size="sm" variant="soft" color="default">v{status.version}</Chip>
          )}
        </div>
      </Card.Header>

      <Card.Content>
        {/* Counts row */}
        <div className="flex items-center gap-3 text-xs text-default-500">
          {toolCount > 0 && (
            <span className="flex items-center gap-1">
              <Wrench size={12} /> {toolCount} tools
            </span>
          )}
          {resourceCount > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen size={12} /> {resourceCount} resources
            </span>
          )}
          {promptCount > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare size={12} /> {promptCount} prompts
            </span>
          )}
          {totalItems === 0 && (
            <span className="italic text-default-400">No tools yet</span>
          )}
        </div>

        {/* Expandable tool list */}
        {totalItems > 0 && (
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setExpanded((v) => !v)}
              className="h-auto px-0 py-0.5 text-xs text-default-500"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? 'Hide' : 'Show'} details
            </Button>

            {expanded && (
              <div className="mt-2 space-y-2">
                {toolCount > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-default-400">Tools</p>
                    <div className="space-y-0.5">
                      {info.tools.map((t) => (
                        <div key={t.name} className="flex items-baseline gap-2 text-xs">
                          <code className="shrink-0 text-accent">{t.name}</code>
                          <span className="truncate text-default-500">{t.description}</span>
                          {t.multiAction && (
                            <Chip size="sm" variant="soft" color="warning" className="shrink-0">
                              multi-action
                            </Chip>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {resourceCount > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-default-400">Resources</p>
                    <div className="space-y-0.5">
                      {info.resources.map((r) => (
                        <div key={r.uri} className="flex items-baseline gap-2 text-xs">
                          <code className="shrink-0 text-accent">{r.uri}</code>
                          <span className="truncate text-default-500">{r.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {promptCount > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-default-400">Prompts</p>
                    <div className="space-y-0.5">
                      {info.prompts.map((p) => (
                        <div key={p.name} className="flex items-baseline gap-2 text-xs">
                          <code className="shrink-0 text-accent">{p.name}</code>
                          <span className="truncate text-default-500">{p.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
