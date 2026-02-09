import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { SessionCard } from '../components/session-card';
import { useSessionsStore } from '../stores/sessions-store';
import { useProjectStore } from '../../../stores/project-store';
import { showSuccess, showError } from '../../../lib/toast';

type ViewMode = 'all' | 'active' | 'completed' | 'non-compliant';

export function SessionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const {
    activeSessions,
    completedSessions,
    complianceBySessionId,
    artifactsBySessionId,
    pendingDraftsBySession,
    loading,
    fetchAll,
    removeSession,
    completeSession,
    fixCompliance,
  } = useSessionsStore();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');

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

  const visibleCompleted = useMemo(() => {
    if (viewMode === 'non-compliant') {
      return filteredCompleted.filter(
        (session) => complianceBySessionId[session.id]?.status === 'non-compliant',
      );
    }
    if (viewMode === 'active') return [];
    return filteredCompleted;
  }, [viewMode, filteredCompleted, complianceBySessionId]);

  const visibleActive = useMemo(() => {
    if (viewMode === 'completed' || viewMode === 'non-compliant') return [];
    return filteredActive;
  }, [viewMode, filteredActive]);

  const total = visibleActive.length + visibleCompleted.length;
  const nonCompliantCount = filteredCompleted.filter(
    (session) => complianceBySessionId[session.id]?.status === 'non-compliant',
  ).length;
  const averageCompliance = Math.round(
    (filteredCompleted.reduce((sum, session) => sum + (session.outcome?.complianceScore ?? 0), 0) /
      Math.max(1, filteredCompleted.length)),
  );
  const fastTrackCount = [...filteredActive, ...filteredCompleted].filter(
    (session) => session.taskClassification?.fastTrack === true,
  ).length;

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

  const handleFixCompliance = async (id: string) => {
    try {
      await fixCompliance(id);
      showSuccess('Compliance drafts generated');
    } catch {
      showError('Failed to generate compliance drafts');
    }
  };

  const navigateToDetail = (id: string) => navigate(`/sessions/${encodeURIComponent(id)}`);

  return (
    <div>
      <PageHeader
        title={t('page.sessions.title')}
        description={
          <div className="flex items-center gap-2 flex-wrap">
            <span>{t('page.sessions.description')}</span>
            <Chip size="sm" color="default">{total} visible</Chip>
            <Chip size="sm" color="accent">{filteredActive.length} active</Chip>
            <Chip size="sm" color="default">{filteredCompleted.length} completed</Chip>
            {nonCompliantCount > 0 && (
              <Chip size="sm" color="danger">{nonCompliantCount} non-compliant</Chip>
            )}
          </div>
        }
      />

      <div className="mb-5 grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <Card className="py-0">
          <CardContent className="px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Sessions</p>
            <p className="text-xl font-semibold">{filteredActive.length + filteredCompleted.length}</p>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Avg Compliance</p>
            <p className="text-xl font-semibold">{averageCompliance}%</p>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fast-Track</p>
            <p className="text-xl font-semibold">{fastTrackCount}</p>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Risk</p>
            <p className="text-xl font-semibold text-destructive">{nonCompliantCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('page.sessions.searchPlaceholder')}
          className="w-full max-w-sm"
        />
        <Button
          size="sm"
          variant={viewMode === 'all' ? 'default' : 'outline'}
          onClick={() => setViewMode('all')}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'active' ? 'default' : 'outline'}
          onClick={() => setViewMode('active')}
        >
          Active
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'completed' ? 'default' : 'outline'}
          onClick={() => setViewMode('completed')}
        >
          Completed
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'non-compliant' ? 'default' : 'outline'}
          onClick={() => setViewMode('non-compliant')}
        >
          Non-Compliant
        </Button>
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

      {!loading && visibleActive.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {t('page.sessions.active', { count: visibleActive.length })}
            </h3>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-3 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
            {visibleActive.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                compliance={complianceBySessionId[session.id]}
                artifacts={artifactsBySessionId[session.id] ?? []}
                pendingDrafts={pendingDraftsBySession[session.id] ?? 0}
                onPress={() => navigateToDetail(session.id)}
                onEdit={() => navigateToDetail(session.id)}
                onComplete={handleComplete}
                onFixCompliance={handleFixCompliance}
                onDelete={(id) => setDeleteTarget(id)}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && visibleCompleted.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {t('page.sessions.completed', { count: visibleCompleted.length })}
            </h3>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-3 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
            {visibleCompleted.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                compliance={complianceBySessionId[session.id]}
                artifacts={artifactsBySessionId[session.id] ?? []}
                pendingDrafts={pendingDraftsBySession[session.id] ?? 0}
                onPress={() => navigateToDetail(session.id)}
                onEdit={() => navigateToDetail(session.id)}
                onFixCompliance={handleFixCompliance}
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
