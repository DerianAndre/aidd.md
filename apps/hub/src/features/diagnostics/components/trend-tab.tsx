import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { McpRequiredBanner } from './mcp-required-banner';
import { DirectionIndicator } from './direction-indicator';
import { HealthTrendChart } from './health-trend-chart';
import { EmptyState } from '../../../components/empty-state';
import { useDiagnosticsStore } from '../stores/diagnostics-store';

const CATEGORIES = ['overall', 'sessionSuccess', 'complianceAvg', 'errorRecurrence', 'modelConsistency', 'memoryUtilization'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  overall: 'Overall',
  sessionSuccess: 'Sessions',
  complianceAvg: 'Compliance',
  errorRecurrence: 'Error Mgmt',
  modelConsistency: 'Model',
  memoryUtilization: 'Memory',
};

export function TrendTab() {
  const { t } = useTranslation();
  const trendData = useDiagnosticsStore((s) => s.trendData);
  const trendLoading = useDiagnosticsStore((s) => s.trendLoading);
  const trendPeriod = useDiagnosticsStore((s) => s.trendPeriod);
  const mcpAvailable = useDiagnosticsStore((s) => s.mcpAvailable);
  const fetchTrend = useDiagnosticsStore((s) => s.fetchTrend);
  const setTrendPeriod = useDiagnosticsStore((s) => s.setTrendPeriod);

  useEffect(() => {
    if (!trendData && !trendLoading) void fetchTrend();
  }, [trendData, trendLoading, fetchTrend]);

  if (mcpAvailable === false) return <McpRequiredBanner />;

  if (trendLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    );
  }

  if (!trendData || trendData.count === 0) {
    return <EmptyState message={t('page.diagnostics.trend.noSnapshots')} />;
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{t('page.diagnostics.trend.period')}</span>
        <Select value={trendPeriod} onValueChange={(v) => setTrendPeriod(v as '7d' | '30d' | '90d' | 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">{t('page.diagnostics.trend.period7d')}</SelectItem>
            <SelectItem value="30d">{t('page.diagnostics.trend.period30d')}</SelectItem>
            <SelectItem value="90d">{t('page.diagnostics.trend.period90d')}</SelectItem>
            <SelectItem value="all">{t('page.diagnostics.trend.periodAll')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alert */}
      {trendData.alert && (
        <Card className="border-danger/50 bg-danger/5">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle size={16} className="shrink-0 text-danger" />
            <p className="text-xs text-danger">{trendData.alert}</p>
          </CardContent>
        </Card>
      )}

      {/* Direction summary */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">{t('page.diagnostics.trend.directionSummary')}</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <DirectionIndicator
              key={cat}
              label={CATEGORY_LABELS[cat]}
              direction={trendData.direction[cat] ?? 'stable'}
              delta={trendData.delta[cat]}
            />
          ))}
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('page.diagnostics.trend.healthOverTime')}</CardTitle>
        </CardHeader>
        <CardContent>
          <HealthTrendChart snapshots={trendData.snapshots} />
        </CardContent>
      </Card>
    </div>
  );
}
