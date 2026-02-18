import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { McpRequiredBanner } from './mcp-required-banner';
import { SessionSelector } from './session-selector';
import { DirectionIndicator } from './direction-indicator';
import { EmptyState } from '../../../components/empty-state';
import { useDiagnosticsStore } from '../stores/diagnostics-store';
import { useProjectStore } from '../../../stores/project-store';
import { truncate, formatDuration } from '../../../lib/utils';
import { cn } from '@/lib/utils';

const METRICS = [
  { key: 'complianceScore', label: 'Compliance' },
  { key: 'testsPassing', label: 'Tests Passing', boolean: true },
  { key: 'filesModified', label: 'Files Modified' },
  { key: 'tasksCompleted', label: 'Tasks Completed' },
  { key: 'errorsResolved', label: 'Errors Resolved' },
  { key: 'decisions', label: 'Decisions' },
  { key: 'uniqueToolsCalled', label: 'Unique Tools' },
  { key: 'reverts', label: 'Reverts', lower: true },
  { key: 'reworks', label: 'Reworks', lower: true },
] as const;

export function SessionsTab() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const sessions = useDiagnosticsStore((s) => s.sessions);
  const comparisonResult = useDiagnosticsStore((s) => s.comparisonResult);
  const comparisonLoading = useDiagnosticsStore((s) => s.comparisonLoading);
  const mcpAvailable = useDiagnosticsStore((s) => s.mcpAvailable);
  const stale = useDiagnosticsStore((s) => s.stale);
  const fetchOverview = useDiagnosticsStore((s) => s.fetch);
  const compareSessions = useDiagnosticsStore((s) => s.compareSessions);

  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (sessions.length === 0 && stale && activeProject?.path) {
      void fetchOverview(activeProject.path);
    }
  }, [sessions.length, stale, activeProject?.path, fetchOverview]);

  const handleToggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleCompare = () => {
    if (selected.length >= 2) void compareSessions(selected);
  };

  if (sessions.length === 0) {
    return <EmptyState message={t('page.diagnostics.noSessions')} />;
  }

  return (
    <div className="space-y-4">
      <SessionSelector
        sessions={sessions}
        selected={selected}
        onToggle={handleToggle}
      />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={selected.length < 2 || comparisonLoading}
          onClick={handleCompare}
        >
          {comparisonLoading
            ? t('page.diagnostics.sessions.comparing')
            : t('page.diagnostics.sessions.compare')}
        </Button>
        {selected.length < 2 && (
          <span className="text-xs text-muted-foreground">
            {t('page.diagnostics.sessions.selectSessions')}
          </span>
        )}
      </div>

      {mcpAvailable === false && <McpRequiredBanner />}

      {comparisonResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-sm">
              {t('page.diagnostics.sessions.title')}
              <DirectionIndicator direction={comparisonResult.trend} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {comparisonLoading ? (
              <Skeleton className="h-48 rounded-lg" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-1.5 pr-3 text-left font-medium text-muted-foreground">
                        {t('page.diagnostics.sessions.metric')}
                      </th>
                      {comparisonResult.sessions.map((s) => (
                        <th key={s.id} className="px-2 py-1.5 text-center font-medium text-foreground">
                          <div>{truncate(s.model, 16)}</div>
                          <div className="text-[10px] font-normal text-muted-foreground">{truncate(s.id, 8)}</div>
                        </th>
                      ))}
                      <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">
                        {t('page.diagnostics.sessions.winner')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {METRICS.map((metric) => {
                      const { key, label } = metric;
                      const isBool = 'boolean' in metric && metric.boolean;
                      const winnerId = comparisonResult.winnerByCategory[key];
                      return (
                        <tr key={key} className="border-b border-border/50">
                          <td className="py-1.5 pr-3 text-muted-foreground">{label}</td>
                          {comparisonResult.sessions.map((s) => {
                            const val = s[key as keyof typeof s];
                            const isWinner = s.id === winnerId;
                            return (
                              <td
                                key={s.id}
                                className={cn(
                                  'px-2 py-1.5 text-center',
                                  isWinner && 'bg-success/10 font-medium text-success',
                                )}
                              >
                                {isBool ? (val ? 'Yes' : 'No') : String(val ?? '—')}
                              </td>
                            );
                          })}
                          <td className="px-2 py-1.5 text-center text-muted-foreground">
                            {winnerId ? truncate(winnerId, 8) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Duration row */}
                    <tr>
                      <td className="py-1.5 pr-3 text-muted-foreground">{t('page.diagnostics.sessions.duration')}</td>
                      {comparisonResult.sessions.map((s) => (
                        <td key={s.id} className="px-2 py-1.5 text-center">
                          {s.durationMs ? formatDuration(s.durationMs) : '—'}
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center text-muted-foreground">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!comparisonResult && !comparisonLoading && selected.length >= 2 && (
        <p className="text-xs text-muted-foreground">{t('page.diagnostics.sessions.noResult')}</p>
      )}
    </div>
  );
}
