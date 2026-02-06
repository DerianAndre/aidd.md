import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Check, AlertTriangle, XCircle, Plug, Trash2 } from 'lucide-react';
import type { IntegrationConfig, IntegrationTool } from '../../../lib/tauri';

const TOOL_META: Record<IntegrationTool, { name: string; description: string }> = {
  claude_code: {
    name: 'Claude Code',
    description: 'Global MCP config + CLAUDE.md + AGENTS.md',
  },
  cursor: {
    name: 'Cursor',
    description: 'Project .cursor/mcp.json + AGENTS.md',
  },
  vscode: {
    name: 'VS Code / Copilot',
    description: '.github/copilot-instructions.md + AGENTS.md',
  },
  gemini: {
    name: 'Gemini',
    description: 'AGENTS.md + .gemini/settings.json',
  },
};

interface IntegrationCardProps {
  config: IntegrationConfig;
  onIntegrate: () => void;
  onRemove: () => void;
  busy: boolean;
}

export function IntegrationCard({ config, onIntegrate, onRemove, busy }: IntegrationCardProps) {
  const meta = TOOL_META[config.integration_type];
  const isConfigured = config.status === 'configured';
  const needsUpdate = config.status === 'needs_update';

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle>{meta.name}</CardTitle>
          <CardDescription>{meta.description}</CardDescription>
        </div>
        <StatusChip status={config.status} />
      </CardHeader>
      <CardContent>
        {config.config_files.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Config files:</p>
            {config.config_files.map((file) => (
              <p key={file} className="truncate text-xs text-muted-foreground" title={file}>
                {file}
              </p>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        {busy ? (
          <Spinner size="sm" />
        ) : (
          <>
            <Button
              size="sm"
              variant={isConfigured ? 'outline' : 'default'}
              onClick={onIntegrate}
            >
              <Plug size={14} />
              {isConfigured ? 'Reinstall' : needsUpdate ? 'Fix' : 'Integrate'}
            </Button>
            {(isConfigured || needsUpdate) && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onRemove}
              >
                <Trash2 size={14} />
                Remove
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
}

function StatusChip({ status }: { status: string }) {
  switch (status) {
    case 'configured':
      return (
        <Chip size="sm" color="success">
          <Check size={12} className="mr-1" />
          Configured
        </Chip>
      );
    case 'needs_update':
      return (
        <Chip size="sm" color="warning">
          <AlertTriangle size={12} className="mr-1" />
          Needs Update
        </Chip>
      );
    default:
      return (
        <Chip size="sm" color="default">
          <XCircle size={12} className="mr-1" />
          Not Configured
        </Chip>
      );
  }
}
