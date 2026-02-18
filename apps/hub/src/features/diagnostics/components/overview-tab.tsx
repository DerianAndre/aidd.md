import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { HealthGauge } from './health-gauge';
import { CategoryBreakdown } from './category-breakdown';
import type { HealthScore, MistakeEntry } from '../../../lib/types';

interface OverviewTabProps {
  healthScore: HealthScore;
  topMistakes: MistakeEntry[];
}

export function OverviewTab({ healthScore, topMistakes }: OverviewTabProps) {
  const { t } = useTranslation();

  return (
    <div>
      {/* Health gauge */}
      <div className="mb-6 flex justify-center">
        <HealthGauge score={healthScore.overall} />
      </div>

      {/* Category breakdown */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">{t('page.diagnostics.categoryBreakdown')}</h3>
        <CategoryBreakdown categories={healthScore.categories} />
      </div>

      {/* Recommendations */}
      {healthScore.recommendations.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-muted/50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">{t('page.diagnostics.recommendations')}</h3>
          <ul className="space-y-1">
            {healthScore.recommendations.map((rec, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                &bull; {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top recurring mistakes */}
      {topMistakes.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {t('page.diagnostics.topRecurringMistakes')}
          </h3>
          <div className="space-y-2">
            {topMistakes.map((m) => (
              <Card key={m.id} className="border border-border bg-muted/50">
                <CardHeader>
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{m.error}</span>
                    <Chip size="sm" color={m.occurrences > 2 ? 'danger' : 'warning'}>
                      {m.occurrences}x
                    </Chip>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">{t('page.diagnostics.fix')}</span> {m.fix}</p>
                  <p className="mt-1">
                    <span className="font-medium text-foreground">{t('page.diagnostics.prevention')}</span> {m.prevention}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-[10px] text-muted-foreground">
        {t('page.diagnostics.basedOn', { count: healthScore.sessionsAnalyzed })}
      </p>
    </div>
  );
}
