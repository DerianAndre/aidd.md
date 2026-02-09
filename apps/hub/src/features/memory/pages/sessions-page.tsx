import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/ui/chip';
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
  const {
    activeSessions,
    completedSessions,
    artifactsBySessionId,
    loading,
    fetchAll,
    removeSession,
    completeSession,
  } = useSessionsStore();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (activeProject?.path) {
      void fetchAll(activeProject.path);
    }
  }, [activeProject?.path, fetchAll]);

  const filterSession = (s: { id: string; name?: string; branch: string; input?: string; aiProvider: { model: string } }, q: string) => {
    return (
      s.id.toLowerCase().includes(q) ||
      (s.name?.toLowerCase().includes(q) ?? false) ||
      s.branch.toLowerCase().includes(q) ||
      s.aiProvider.model.toLowerCase().includes(q) ||
      (s.input?.toLowerCase().includes(q) ?? false)
    );
  };

  const filteredActive = useMemo(() => {
    if (!search.trim()) return activeSessions;
    const q = search.toLowerCase();
    return activeSessions.filter((s) => filterSession(s, q));
  }, [activeSessions, search]);

  const filteredCompleted = useMemo(() => {
    if (!search.trim()) return completedSessions;
    const q = search.toLowerCase();
    return completedSessions.filter((s) => filterSession(s, q));
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

  const handleComplete = async (id: string) => {
    try {
      await completeSession(id);
      showSuccess(t('page.sessions.completeSuccess'));
    } catch {
      showError(t('page.sessions.completeError'));
    }
  };

  const navigateToDetail = (id: string) => navigate(`/sessions/${encodeURIComponent(id)}`);

  return (
    <div>
      <PageHeader
        title={t('page.sessions.title')}
        description={
          <span className="flex items-center gap-2">
            <span>{t('page.sessions.description')}</span>
            <Chip size="sm" color="default">{total} total</Chip>
            {filteredActive.length > 0 && (
              <Chip size="sm" color="accent">{filteredActive.length} active</Chip>
            )}
          </span>
        }
      />

      <div className="mb-5">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('page.sessions.searchPlaceholder')}
          className="max-w-sm"
        />
      </div>

      {loading && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && total === 0 && (
        <EmptyState message={search ? t('page.sessions.noMatch') : t('page.sessions.noSessions')} />
      )}

      {!loading && filteredActive.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {t('page.sessions.active', { count: filteredActive.length })}
            </h3>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredActive.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                artifacts={artifactsBySessionId[session.id] ?? []}
                onPress={() => navigateToDetail(session.id)}
                onEdit={() => navigateToDetail(session.id)}
                onComplete={handleComplete}
                onDelete={(id) => setDeleteTarget(id)}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && filteredCompleted.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {t('page.sessions.completed', { count: filteredCompleted.length })}
            </h3>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCompleted.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                artifacts={artifactsBySessionId[session.id] ?? []}
                onPress={() => navigateToDetail(session.id)}
                onEdit={() => navigateToDetail(session.id)}
                onDelete={(id) => setDeleteTarget(id)}
              />
            ))}
          </div>
        </section>
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
