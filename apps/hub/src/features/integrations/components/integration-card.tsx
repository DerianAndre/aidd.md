import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Check, AlertTriangle, XCircle, Plug, Trash2, Code, Package } from 'lucide-react';
import type { IntegrationConfig, IntegrationTool } from '../../../lib/tauri';

const TOOL_META = {
  claude_code: {
    nameKey: 'page.integrations.tool.claudeCode',
    descriptionKey: 'page.integrations.tool.claudeCodeDesc',
    hasMcp: true,
  },
  cursor: {
    nameKey: 'page.integrations.tool.cursor',
    descriptionKey: 'page.integrations.tool.cursorDesc',
    hasMcp: true,
  },
  vscode: {
    nameKey: 'page.integrations.tool.vscode',
    descriptionKey: 'page.integrations.tool.vscodeDesc',
    hasMcp: false, // VS Code MCP is manual
  },
  gemini: {
    nameKey: 'page.integrations.tool.gemini',
    descriptionKey: 'page.integrations.tool.geminiDesc',
    hasMcp: false,
  },
} as const satisfies Record<IntegrationTool, { nameKey: string; descriptionKey: string; hasMcp: boolean }>;

interface IntegrationCardProps {
  config: IntegrationConfig;
  onIntegrate: (devMode: boolean) => void;
  onRemove: () => void;
  busy: boolean;
}

export function IntegrationCard({ config, onIntegrate, onRemove, busy }: IntegrationCardProps) {
  const { t } = useTranslation();
  const meta = TOOL_META[config.integration_type];
  const isConfigured = config.status === 'configured';
  const needsUpdate = config.status === 'needs_update';

  return (
    <Card>
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle>{t(meta.nameKey)}</CardTitle>
          <CardDescription>{t(meta.descriptionKey)}</CardDescription>
        </div>
        <div className="flex items-center gap-1.5">
          {isConfigured && config.dev_mode && (
            <Chip size="sm" color="accent">
              <Code size={10} className="mr-1" />
              DEV
            </Chip>
          )}
          <StatusChip status={config.status} />
        </div>
      </CardHeader>
      <CardContent>
        {config.config_files.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t('page.integrations.configFiles')}</p>
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
              onClick={() => onIntegrate(config.dev_mode)}
            >
              <Plug size={14} />
              {isConfigured
                ? t('page.integrations.reinstall')
                : needsUpdate
                  ? t('page.integrations.fix')
                  : t('page.integrations.integrate')}
            </Button>
            {meta.hasMcp && (isConfigured || needsUpdate) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onIntegrate(!config.dev_mode)}
                title={config.dev_mode ? t('page.integrations.switchToProd') : t('page.integrations.switchToDev')}
              >
                {config.dev_mode ? <Package size={14} /> : <Code size={14} />}
                {config.dev_mode ? t('page.integrations.prod') : t('page.integrations.dev')}
              </Button>
            )}
            {(isConfigured || needsUpdate) && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onRemove}
              >
                <Trash2 size={14} />
                {t('common.remove')}
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
}

function StatusChip({ status }: { status: string }) {
  const { t } = useTranslation();
  switch (status) {
    case 'configured':
      return (
        <Chip size="sm" color="success">
          <Check size={12} className="mr-1" />
          {t('page.integrations.statusConfigured')}
        </Chip>
      );
    case 'needs_update':
      return (
        <Chip size="sm" color="warning">
          <AlertTriangle size={12} className="mr-1" />
          {t('page.integrations.statusNeedsUpdate')}
        </Chip>
      );
    default:
      return (
        <Chip size="sm" color="default">
          <XCircle size={12} className="mr-1" />
          {t('page.integrations.statusNotConfigured')}
        </Chip>
      );
  }
}
