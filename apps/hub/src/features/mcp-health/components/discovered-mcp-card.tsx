import { Chip } from '@heroui/react';
import { Bot, MousePointer2, Code, Sparkles } from 'lucide-react';
import type { DiscoveredMcp, McpToolSource, McpServer } from '../../../lib/tauri';
import { truncate } from '../../../lib/utils';

const TOOL_CONFIG: Record<McpToolSource, { label: string; icon: typeof Bot }> = {
  claude_code: { label: 'Claude Code', icon: Bot },
  cursor: { label: 'Cursor', icon: MousePointer2 },
  vscode: { label: 'VS Code', icon: Code },
  gemini: { label: 'Gemini', icon: Sparkles },
};

const STATUS_COLOR = {
  running: 'success',
  stopped: 'default',
  error: 'danger',
} as const;

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
    <div className="flex items-center justify-between gap-3 rounded-lg border border-default-200 bg-content1 px-3 py-2">
      {/* Left: icon + name + badges */}
      <div className="flex items-center gap-2 overflow-hidden">
        <ToolIcon size={16} className="shrink-0 text-default-400" />
        <span className="font-medium text-sm text-foreground truncate">{entry.name}</span>
        <Chip size="sm" variant="soft" color="default">
          {entry.scope === 'global' ? 'Global' : 'Project'}
        </Chip>
        {entry.is_aidd && (
          <Chip size="sm" variant="soft" color="accent">
            aidd.md
          </Chip>
        )}
        {hubServer && (
          <Chip size="sm" variant="soft" color={STATUS_COLOR[hubServer.status]}>
            {hubServer.status}
          </Chip>
        )}
      </div>

      {/* Right: command preview */}
      {commandPreview && (
        <span
          className="shrink-0 text-[11px] font-mono text-default-400 max-w-[280px] truncate"
          title={commandPreview}
        >
          {truncate(commandPreview, 50)}
        </span>
      )}
    </div>
  );
}
