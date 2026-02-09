import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Target, CheckCircle, Cpu, ArrowRight } from 'lucide-react';
import { useSessionsStore } from '../../memory/stores/sessions-store';
import { useProjectStore } from '../../../stores/project-store';
import { formatRelativeTime } from '../../../lib/utils';
import { ROUTES } from '../../../lib/constants';

const FEEDBACK_COLORS: Record<string, 'success' | 'danger' | 'default'> = {
  positive: 'success',
  negative: 'danger',
  neutral: 'default',
};

export function IntelligenceWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);

  const activeSessions = useSessionsStore((s) => s.activeSessions);
  const completedSessions = useSessionsStore((s) => s.completedSessions);
  const sessionsLoading = useSessionsStore((s) => s.loading);
  const sessionsStale = useSessionsStore((s) => s.stale);
  const fetchSessions = useSessionsStore((s) => s.fetchAll);

  useEffect(() => {
    if (!activeProject?.path) return;
    if (sessionsStale) void fetchSessions(activeProject.path);
  }, [activeProject?.path, sessionsStale, fetchSessions]);

  const completedWithOutcome = completedSessions.filter((session) => session.outcome);
  const totalSessions = completedSessions.length;
  const avgCompliance = completedWithOutcome.length > 0
    ? Math.round(
        completedWithOutcome.reduce((acc, session) => acc + (session.outcome?.complianceScore ?? 0), 0) /
        completedWithOutcome.length,
      )
    : 0;
  const testPassRate = completedWithOutcome.length > 0
    ? Math.round(
        (completedWithOutcome.filter((session) => session.outcome?.testsPassing).length / completedWithOutcome.length) *
        100,
      )
    : 0;
  const uniqueModels = new Set(
    [...activeSessions, ...completedSessions].map((session) => session.aiProvider?.modelId ?? session.aiProvider?.model),
  ).size;

  const recentSessions = [
    ...activeSessions.map((s) => ({ ...s, _active: true as const })),
    ...completedSessions.slice(0, 4),
  ].slice(0, 4);

  const stats = [
    { icon: BarChart3, value: totalSessions, labelKey: 'page.dashboard.statSessions' as const },
    { icon: Cpu, value: uniqueModels, labelKey: 'page.dashboard.statModels' as const },
    { icon: Target, value: avgCompliance > 0 ? `${avgCompliance}%` : '\u2014', labelKey: 'page.dashboard.statCompliance' as const },
    { icon: CheckCircle, value: testPassRate > 0 ? `${testPassRate}%` : '\u2014', labelKey: 'page.dashboard.statTestPass' as const },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{t('page.dashboard.intelligence')}</CardTitle>
        <CardAction>
          <Link
            to={ROUTES.ANALYTICS}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {t('nav.analytics')} <ArrowRight size={12} />
          </Link>
        </CardAction>
      </CardHeader>

      {/* Compact stats row */}
      <CardContent>
        <div className="flex flex-wrap gap-4">
          {stats.map(({ icon: Icon, value, labelKey }) => (
            <div key={labelKey} className="flex items-center gap-1.5">
              <Icon size={14} className="text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">{value}</span>
              <span className="text-[10px] text-muted-foreground">{t(labelKey)}</span>
            </div>
          ))}
        </div>
      </CardContent>

      <Separator />

      {/* Recent sessions */}
      <CardContent>
        {sessionsLoading ? (
          <Skeleton className="h-16 rounded-lg" />
        ) : recentSessions.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">{t('page.dashboard.noSessionsYet')}</p>
        ) : (
          <div className="space-y-1.5">
            {recentSessions.map((session) => {
              const isActive = '_active' in session;
              const feedback = !isActive ? session.outcome?.userFeedback : undefined;
              return (
                <button
                  key={session.memorySessionId ?? session.id}
                  type="button"
                  onClick={() => navigate(`/sessions/${session.memorySessionId ?? session.id}`)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-accent"
                >
                  <Chip
                    size="sm"
                    color={isActive ? 'accent' : FEEDBACK_COLORS[feedback ?? ''] ?? 'default'}
                  >
                    {isActive ? t('page.dashboard.sessionActive') : feedback ?? t('page.dashboard.sessionDone')}
                  </Chip>
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                    {session.aiProvider?.model ?? 'unknown'}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatRelativeTime(session.startedAt)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
