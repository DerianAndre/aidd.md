import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/ui/chip';
import { McpRequiredBanner } from './mcp-required-banner';
import { SystemHealthSection } from './system-health-section';
import { useDiagnosticsStore } from '../stores/diagnostics-store';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}

export function SystemTab() {
  const { t } = useTranslation();
  const systemHealth = useDiagnosticsStore((s) => s.systemHealth);
  const systemHealthLoading = useDiagnosticsStore((s) => s.systemHealthLoading);
  const mcpAvailable = useDiagnosticsStore((s) => s.mcpAvailable);
  const fetchSystemHealth = useDiagnosticsStore((s) => s.fetchSystemHealth);

  useEffect(() => {
    if (!systemHealth && !systemHealthLoading) void fetchSystemHealth();
  }, [systemHealth, systemHealthLoading, fetchSystemHealth]);

  if (mcpAvailable === false) return <McpRequiredBanner />;

  if (systemHealthLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!systemHealth) return <McpRequiredBanner />;

  const statusColor = { healthy: 'default', warning: 'secondary', error: 'destructive' } as const;

  return (
    <div className="space-y-4">
      {/* Overall status */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{t('page.diagnostics.system.overall')}</span>
        <Badge variant={statusColor[systemHealth.overall]}>
          {t(`page.diagnostics.system.${systemHealth.overall}`)}
        </Badge>
      </div>

      {/* 4-section grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* SQLite */}
        <SystemHealthSection title={t('page.diagnostics.system.sqlite')} status={systemHealth.sqlite.status}>
          <div className="space-y-0.5">
            <StatRow label={t('page.diagnostics.system.dbSize')} value={formatBytes(systemHealth.sqlite.dbSizeBytes)} />
            <StatRow label={t('page.diagnostics.system.walSize')} value={formatBytes(systemHealth.sqlite.walSizeBytes)} />
            <StatRow label={t('page.diagnostics.system.schemaVersion')} value={`v${systemHealth.sqlite.schemaVersion}`} />
            <StatRow label={t('page.diagnostics.system.tables')} value={Object.keys(systemHealth.sqlite.tableCounts).length} />
          </div>
        </SystemHealthSection>

        {/* HookBus */}
        <SystemHealthSection title={t('page.diagnostics.system.hooks')} status={systemHealth.hooks.status}>
          <div className="space-y-1">
            <div className="flex gap-2">
              <Chip size="sm" color="success">{systemHealth.hooks.active} {t('page.diagnostics.system.hooksActive')}</Chip>
              {systemHealth.hooks.disabled > 0 && (
                <Chip size="sm" color="danger">{systemHealth.hooks.disabled} {t('page.diagnostics.system.hooksDisabled')}</Chip>
              )}
            </div>
            {systemHealth.hooks.details.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {systemHealth.hooks.details.map((h) => (
                  <div key={h.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${h.disabled ? 'bg-danger' : 'bg-success'}`} />
                    <span className="font-mono">{h.name}</span>
                    {h.failures > 0 && <span className="text-danger">({h.failures} {t('page.diagnostics.system.hookFailures')})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SystemHealthSection>

        {/* Memory */}
        <SystemHealthSection title={t('page.diagnostics.system.memory')} status={systemHealth.memory.status}>
          <div className="space-y-0.5">
            <StatRow label={t('page.diagnostics.system.decisions')} value={systemHealth.memory.decisions} />
            <StatRow label={t('page.diagnostics.system.mistakes')} value={systemHealth.memory.mistakes} />
            <StatRow label={t('page.diagnostics.system.conventions')} value={systemHealth.memory.conventions} />
            <StatRow label={t('page.diagnostics.system.observations')} value={systemHealth.memory.observations} />
          </div>
        </SystemHealthSection>

        {/* Sessions */}
        <SystemHealthSection title={t('page.diagnostics.system.sessions')} status={systemHealth.sessions.status}>
          <div className="space-y-0.5">
            <StatRow label={t('page.diagnostics.system.totalSessions')} value={systemHealth.sessions.total} />
            <StatRow label={t('page.diagnostics.system.activeSessions')} value={systemHealth.sessions.active} />
            <StatRow label={t('page.diagnostics.system.completedSessions')} value={systemHealth.sessions.completed} />
            <StatRow label={t('page.diagnostics.system.avgCompliance')} value={`${Math.round(systemHealth.sessions.avgCompliance)}%`} />
          </div>
        </SystemHealthSection>
      </div>
    </div>
  );
}
