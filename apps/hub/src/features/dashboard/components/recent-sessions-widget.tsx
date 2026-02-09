import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useSessionsStore } from '../../memory/stores/sessions-store';
import { useProjectStore } from '../../../stores/project-store';
import { formatRelativeTime } from '../../../lib/utils';
import { ROUTES } from '../../../lib/constants';
import { getDateInput, getSessionStartedMs } from '../../memory/lib/session-time';

export function RecentSessionsWidget() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const {
    activeSessions,
    completedSessions,
    complianceBySessionId,
    pendingDraftsBySession,
    loading,
    stale,
    fetchAll,
  } = useSessionsStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetchAll(activeProject.path);
    }
  }, [activeProject?.path, stale, fetchAll]);

  const recent = [...activeSessions, ...completedSessions]
    .sort((a, b) => getSessionStartedMs(b) - getSessionStartedMs(a))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    );
  }

  if (recent.length === 0) {
    return <p className="text-xs text-muted-foreground">{t('page.dashboard.noSessionsRecorded')}</p>;
  }

  return (
    <div className="space-y-1">
      {recent.map((s) => {
        const isActive = !s.endedAt;
        const passed = s.outcome?.testsPassing;
        const compliance = complianceBySessionId[s.id];
        const pendingDrafts = pendingDraftsBySession[s.id] ?? 0;
        return (
          <div
            key={s.id}
            className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
            role="button"
            tabIndex={0}
            onClick={() => navigate(ROUTES.SESSION_DETAIL.replace(':id', s.id))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigate(ROUTES.SESSION_DETAIL.replace(':id', s.id));
            }}
          >
            <div className="flex items-center gap-2">
              <Chip
                size="sm"
                color={isActive ? 'accent' : passed ? 'success' : 'danger'}
              >
                {isActive ? t('page.dashboard.sessionActive') : passed ? t('page.dashboard.sessionPassed') : t('page.dashboard.sessionFailed')}
              </Chip>
              {!isActive && compliance && (
                <Chip
                  size="sm"
                  color={compliance.status === 'compliant' ? 'success' : 'danger'}
                  title={
                    compliance.status === 'non-compliant'
                      ? `${t('page.sessions.missingArtifacts')}: ${compliance.missing.join(', ')}`
                      : undefined
                  }
                >
                  {compliance.status === 'compliant'
                    ? t('page.sessions.compliant')
                    : t('page.sessions.nonCompliant')}
                </Chip>
              )}
              {pendingDrafts > 0 && (
                <Chip size="sm" color="warning">
                  Pending {pendingDrafts}
                </Chip>
              )}
              <span className="text-xs text-foreground">{s.aiProvider.model}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{formatRelativeTime(getDateInput(s.startedAtTs ?? s.startedAt))}</span>
          </div>
        );
      })}
    </div>
  );
}
