import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ChevronDown, ChevronUp, Wrench, BookOpen, MessageSquare, Play, Square } from 'lucide-react';
import type { McpPackageInfo } from '../lib/mcp-catalog';
import type { McpPackageStatus } from '../stores/mcp-servers-store';
import type { McpServer } from '../../../lib/tauri';

const ROLE_COLORS: Record<string, 'accent' | 'success' | 'warning' | 'danger' | 'default'> = {
  'The Brain': 'accent',
  'The Memory': 'success',
  'The Hands': 'warning',
  'Engine': 'default',
  'Foundation': 'default',
};

/** Maps package dir to the server id used by the Rust backend. */
const DIR_TO_SERVER_ID: Record<string, string> = {
  'mcp-aidd-engine': 'engine',
  'mcp-aidd-core': 'core',
  'mcp-aidd-memory': 'memory',
  'mcp-aidd-tools': 'tools',
};

interface PackageCardProps {
  info: McpPackageInfo;
  status?: McpPackageStatus;
  server?: McpServer;
  onStart?: (serverId: string) => Promise<void>;
  onStop?: (serverId: string) => Promise<void>;
}

export function PackageCard({ info, status, server, onStart, onStop }: PackageCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const toolCount = info.tools.length;
  const resourceCount = info.resources.length;
  const promptCount = info.prompts.length;
  const totalItems = toolCount + resourceCount + promptCount;

  const serverId = DIR_TO_SERVER_ID[info.dir];
  const canManage = !!serverId;
  const isRunning = server?.status === 'running';
  const hasError = server?.status === 'error';

  const handleToggle = async () => {
    if (!serverId) return;
    setBusy(true);
    try {
      if (isRunning) {
        await onStop?.(serverId);
      } else {
        await onStart?.(serverId);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border border-border bg-muted/50">
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {/* Build status dot */}
            {status && (
              <span
                className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${status.built ? 'bg-success' : 'bg-danger'}`}
                title={status.built ? 'Built' : 'Not built'}
              />
            )}
            <CardTitle className="truncate text-sm">{info.name}</CardTitle>
          </div>
          <CardDescription className="mt-0.5">{info.description}</CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isRunning && (
            <Chip size="sm" color="success">Running</Chip>
          )}
          {hasError && (
            <Chip size="sm" color="danger">Error</Chip>
          )}
          <Chip size="sm" color={ROLE_COLORS[info.role] ?? 'default'}>
            {info.role}
          </Chip>
          {status && (
            <Chip size="sm" color="default">v{status.version}</Chip>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Server info */}
        {server && isRunning && server.pid && (
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>PID: {server.pid}</span>
          </div>
        )}
        {server?.error && (
          <p className="mb-2 text-xs text-danger">{server.error}</p>
        )}

        {/* Counts row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
            <span className="italic text-muted-foreground">No tools yet</span>
          )}
        </div>

        {/* Expandable tool list */}
        {totalItems > 0 && (
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="h-auto px-0 py-0.5 text-xs text-muted-foreground"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? 'Hide' : 'Show'} details
            </Button>

            {expanded && (
              <div className="mt-2 space-y-2">
                {toolCount > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tools</p>
                    <div className="space-y-0.5">
                      {info.tools.map((t) => (
                        <div key={t.name} className="flex items-baseline gap-2 text-xs">
                          <code className="shrink-0 text-accent">{t.name}</code>
                          <span className="truncate text-muted-foreground">{t.description}</span>
                          {t.multiAction && (
                            <Chip size="sm" color="warning" className="shrink-0">
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
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Resources</p>
                    <div className="space-y-0.5">
                      {info.resources.map((r) => (
                        <div key={r.uri} className="flex items-baseline gap-2 text-xs">
                          <code className="shrink-0 text-accent">{r.uri}</code>
                          <span className="truncate text-muted-foreground">{r.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {promptCount > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prompts</p>
                    <div className="space-y-0.5">
                      {info.prompts.map((p) => (
                        <div key={p.name} className="flex items-baseline gap-2 text-xs">
                          <code className="shrink-0 text-accent">{p.name}</code>
                          <span className="truncate text-muted-foreground">{p.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Server controls */}
      {canManage && (
        <CardFooter className="flex gap-2">
          {busy ? (
            <Spinner size="sm" />
          ) : (
            <Button
              size="sm"
              variant={isRunning ? 'destructive' : 'default'}
              onClick={() => void handleToggle()}
            >
              {isRunning ? <Square size={14} /> : <Play size={14} />}
              {isRunning ? 'Stop' : 'Start'}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
