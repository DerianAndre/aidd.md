import { Chip } from '@/components/ui/chip';
import { Bot, MousePointer2, Code, Sparkles, Wind } from 'lucide-react';
import type { DiscoveredMcp, McpToolSource, McpServer } from '../../../lib/tauri';
import { truncate } from '../../../lib/utils';

const TOOL_CONFIG: Record<McpToolSource, { label: string; icon: typeof Bot }> = {
  claude_code: { label: 'Claude Code', icon: Bot },
  cursor: { label: 'Cursor', icon: MousePointer2 },
  vscode: { label: 'VS Code', icon: Code },
  gemini: { label: 'Gemini', icon: Sparkles },
  windsurf: { label: 'Windsurf', icon: Wind },
};

const STATUS_COLOR = {
  running: 'success',
  stopped: 'default',
  error: 'danger',
} as const;

const TRANSPORT_COLOR: Record<string, 'default' | 'accent' | 'warning'> = {
  stdio: 'default',
  http: 'accent',
  sse: 'warning',
};

interface DiscoveredMcpCardProps {
  entry: DiscoveredMcp;
  hubServer?: McpServer;
}

export function DiscoveredMcpCard({ entry, hubServer }: DiscoveredMcpCardProps) {
  const tool = TOOL_CONFIG[entry.tool];
  const ToolIcon = tool.icon;

  const commandPreview = entry.command
    ? [entry.command, ...(entry.args ?? [])].join(' ')
    : entry.url ?? null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      {/* Line 1: icon + name + badges */}
      <div className="flex items-center gap-2 overflow-hidden">
        <ToolIcon size={16} className="shrink-0 text-muted-foreground" />
        <span className="font-medium text-sm text-foreground truncate">{entry.name}</span>
        <Chip size="sm" color="default">
          {entry.scope === 'global' ? 'Global' : 'Project'}
        </Chip>
        {entry.is_aidd && (
          <Chip size="sm" color="accent">
            aidd.md
          </Chip>
        )}
        {hubServer && (
          <Chip size="sm" color={STATUS_COLOR[hubServer.status]}>
            {hubServer.status}
          </Chip>
        )}
      </div>

      {/* Line 2: transport type + config path / command preview */}
      <div className="mt-1 flex items-center gap-2 pl-6">
        {entry.transport_type && (
          <Chip size="sm" color={TRANSPORT_COLOR[entry.transport_type] ?? 'default'}>
            {entry.transport_type}
          </Chip>
        )}
        <span
          className="text-[11px] font-mono text-muted-foreground truncate"
          title={entry.config_path}
        >
          {commandPreview
            ? truncate(commandPreview, 60)
            : truncate(entry.config_path, 60)}
        </span>
      </div>
    </div>
  );
}
