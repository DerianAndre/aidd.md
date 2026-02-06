import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { SessionCard } from '../components/session-card';
import { useSessionsStore } from '../stores/sessions-store';
import { useProjectStore } from '../../../stores/project-store';

export function SessionsPage() {
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { activeSessions, completedSessions, loading, stale, fetchAll } = useSessionsStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetchAll(activeProject.path);
    }
  }, [activeProject?.path, stale, fetchAll]);

  const filteredActive = useMemo(() => {
    if (!search.trim()) return activeSessions;
    const q = search.toLowerCase();
    return activeSessions.filter(
      (s) => s.branch.toLowerCase().includes(q) || s.aiProvider.model.toLowerCase().includes(q),
    );
  }, [activeSessions, search]);

  const filteredCompleted = useMemo(() => {
    if (!search.trim()) return completedSessions;
    const q = search.toLowerCase();
    return completedSessions.filter(
      (s) => s.branch.toLowerCase().includes(q) || s.aiProvider.model.toLowerCase().includes(q),
    );
  }, [completedSessions, search]);

  const total = filteredActive.length + filteredCompleted.length;

  return (
    <div>
      <PageHeader title="Sessions" description="Active and completed AI sessions" />

      <div className="mb-4 flex items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by branch or model..."
          className="max-w-xs"
        />
        <span className="text-xs text-muted-foreground">
          {total} session{total !== 1 ? 's' : ''}
        </span>
      </div>

      {loading && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && total === 0 && (
        <EmptyState message={search ? 'No sessions match your search.' : 'No sessions found. Start a development session to see data here.'} />
      )}

      {!loading && filteredActive.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Active ({filteredActive.length})</h3>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredActive.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onPress={() => navigate(`/sessions/${encodeURIComponent(session.id)}`)}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && filteredCompleted.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Completed ({filteredCompleted.length})</h3>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCompleted.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onPress={() => navigate(`/sessions/${encodeURIComponent(session.id)}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
