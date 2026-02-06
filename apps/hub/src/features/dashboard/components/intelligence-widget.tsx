import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Target, CheckCircle, Cpu, ArrowRight } from 'lucide-react';
import { useAnalyticsStore } from '../../analytics/stores/analytics-store';
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
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);

  const totalSessions = useAnalyticsStore((s) => s.totalSessions);
  const avgCompliance = useAnalyticsStore((s) => s.avgCompliance);
  const testPassRate = useAnalyticsStore((s) => s.testPassRate);
  const uniqueModels = useAnalyticsStore((s) => s.uniqueModels);
  const analyticsStale = useAnalyticsStore((s) => s.stale);
  const fetchAnalytics = useAnalyticsStore((s) => s.fetch);

  const activeSessions = useSessionsStore((s) => s.activeSessions);
  const completedSessions = useSessionsStore((s) => s.completedSessions);
  const sessionsLoading = useSessionsStore((s) => s.loading);
  const sessionsStale = useSessionsStore((s) => s.stale);
  const fetchSessions = useSessionsStore((s) => s.fetchAll);

  useEffect(() => {
    if (!activeProject?.path) return;
    if (analyticsStale) void fetchAnalytics(activeProject.path);
    if (sessionsStale) void fetchSessions(activeProject.path);
  }, [activeProject?.path, analyticsStale, sessionsStale, fetchAnalytics, fetchSessions]);

  const recentSessions = [
    ...activeSessions.map((s) => ({ ...s, _active: true as const })),
    ...completedSessions.slice(0, 4),
  ].slice(0, 4);

  const stats = [
    { icon: BarChart3, value: totalSessions, label: 'Sessions' },
    { icon: Cpu, value: uniqueModels, label: 'Models' },
    { icon: Target, value: avgCompliance > 0 ? `${avgCompliance}%` : '\u2014', label: 'Compliance' },
    { icon: CheckCircle, value: testPassRate > 0 ? `${testPassRate}%` : '\u2014', label: 'Test Pass' },
  ];

  return (
    <div className="rounded-xl border border-border bg-muted/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Intelligence</h3>
        <Link
          to={ROUTES.ANALYTICS}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Analytics <ArrowRight size={12} />
        </Link>
      </div>

      {/* Compact stats row */}
      <div className="flex flex-wrap gap-4">
        {stats.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon size={14} className="text-muted-foreground" />
            <span className="text-sm font-bold text-foreground">{value}</span>
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="my-3 border-t border-border" />

      {/* Recent sessions */}
      {sessionsLoading ? (
        <Skeleton className="h-16 rounded-lg" />
      ) : recentSessions.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">No sessions yet</p>
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
                  {isActive ? 'active' : feedback ?? 'done'}
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
    </div>
  );
}
