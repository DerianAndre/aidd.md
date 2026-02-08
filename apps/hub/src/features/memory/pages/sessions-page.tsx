import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { SessionCard } from '../components/session-card';
import { useSessionsStore } from '../stores/sessions-store';
import { useProjectStore } from '../../../stores/project-store';
import { showSuccess, showError } from '../../../lib/toast';

export function SessionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { activeSessions, completedSessions, loading, stale, fetchAll, removeSession } = useSessionsStore();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeSession(deleteTarget);
      showSuccess(t('page.sessions.deleteSuccess'));
    } catch {
      showError(t('page.sessions.deleteError'));
    }
  };

  const navigateToDetail = (id: string) => navigate(`/sessions/${encodeURIComponent(id)}`);

  return (
    <div>
      <PageHeader title={t('page.sessions.title')} description={t('page.sessions.description')} />

      <div className="mb-4 flex items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('page.sessions.searchPlaceholder')}
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
        <EmptyState message={search ? t('page.sessions.noMatch') : t('page.sessions.noSessions')} />
      )}

      {!loading && filteredActive.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-foreground">{t('page.sessions.active', { count: filteredActive.length })}</h3>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredActive.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onPress={() => navigateToDetail(session.id)}
                onEdit={() => navigateToDetail(session.id)}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && filteredCompleted.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">{t('page.sessions.completed', { count: filteredCompleted.length })}</h3>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCompleted.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onPress={() => navigateToDetail(session.id)}
                onEdit={() => navigateToDetail(session.id)}
                onDelete={(id) => setDeleteTarget(id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={t('page.sessions.deleteTitle')}
        description={t('page.sessions.deleteDescription')}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
