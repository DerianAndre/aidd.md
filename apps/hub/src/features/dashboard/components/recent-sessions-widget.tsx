import { useEffect } from 'react';
import { Chip, Skeleton } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { useSessionsStore } from '../../memory/stores/sessions-store';
import { useProjectStore } from '../../../stores/project-store';
import { formatRelativeTime } from '../../../lib/utils';
import { ROUTES } from '../../../lib/constants';

export function RecentSessionsWidget() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { activeSessions, completedSessions, loading, stale, fetchAll } = useSessionsStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetchAll(activeProject.path);
    }
  }, [activeProject?.path, stale, fetchAll]);

  const recent = [...activeSessions, ...completedSessions]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
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
    return <p className="text-xs text-default-400">No sessions recorded yet.</p>;
  }

  return (
    <div className="space-y-1">
      {recent.map((s) => {
        const isActive = !s.endedAt;
        const passed = s.outcome?.testsPassing;
        return (
          <div
            key={s.id}
            className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-default-100"
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
                variant="soft"
                color={isActive ? 'accent' : passed ? 'success' : 'danger'}
              >
                {isActive ? 'active' : passed ? 'passed' : 'failed'}
              </Chip>
              <span className="text-xs text-foreground">{s.aiProvider.model}</span>
            </div>
            <span className="text-[10px] text-default-400">{formatRelativeTime(s.startedAt)}</span>
          </div>
        );
      })}
    </div>
  );
}
