import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/ui/chip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { ArtifactCard } from '../components/artifact-card';
import { ArtifactFormDialog } from '../components/artifact-form-dialog';
import { useArtifactsStore } from '../stores/artifacts-store';
import { useProjectStore } from '../../../stores/project-store';
import { ROUTES } from '../../../lib/constants';
import { groupByFeature, TYPE_COLORS } from '../lib/parse-artifact';
import { showSuccess, showError } from '../../../lib/toast';
import { ARTIFACT_TYPES } from '../../../lib/types';
import type { ArtifactType, ArtifactStatus } from '../../../lib/types';

export function ArtifactsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { artifacts, loading, stale, fetch, create, archive, remove } = useArtifactsStore();
  const [search, setSearch] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<ArtifactType>>(new Set());
  const [tab, setTab] = useState<ArtifactStatus | 'all'>('active');

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);

  // Confirm dialog state
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; action: 'archive' | 'delete' } | null>(null);

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetch(activeProject.path);
    }
  }, [activeProject?.path, stale, fetch]);

  const toggleType = (type: ArtifactType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = artifacts;
    if (tab !== 'all') {
      result = result.filter((a) => a.status === tab);
    }
    if (activeTypes.size > 0) {
      result = result.filter((a) => activeTypes.has(a.type));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.feature.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q),
      );
    }
    return result;
  }, [artifacts, tab, activeTypes, search]);

  const activeCount = useMemo(
    () => artifacts.filter((a) => a.status === 'active').length,
    [artifacts],
  );
  const doneCount = useMemo(
    () => artifacts.filter((a) => a.status === 'done').length,
    [artifacts],
  );

  const grouped = useMemo(() => groupByFeature(filtered), [filtered]);

  const navigateToDetail = (id: string) => {
    navigate(`${ROUTES.ARTIFACTS}/${id}`);
  };

  const handleCreate = async (type: string, feature: string, title: string, description: string, content: string) => {
    try {
      await create(type, feature, title, description, content);
      showSuccess(t('page.artifacts.createSuccess'));
    } catch {
      showError(t('page.artifacts.createError'));
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.action === 'archive') {
        await archive(confirmTarget.id);
        showSuccess(t('page.artifacts.archiveSuccess'));
      } else {
        await remove(confirmTarget.id);
        showSuccess(t('page.artifacts.deleteSuccess'));
      }
    } catch {
      showError(confirmTarget.action === 'archive' ? t('page.artifacts.archiveError') : t('page.artifacts.deleteError'));
    }
  };

  return (
    <div>
      <PageHeader
        title={t('page.artifacts.title')}
        description={t('page.artifacts.description')}
        actions={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus size={16} /> {t('page.artifacts.createArtifact')}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('page.artifacts.searchPlaceholder')}
          className="max-w-xs"
        />
        <span className="text-xs text-muted-foreground">
          {t('page.artifacts.count', { count: filtered.length })}
        </span>
      </div>

      {/* Type filter chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {ARTIFACT_TYPES.map((type) => (
          <Chip
            key={type}
            size="sm"
            color={
              activeTypes.has(type)
                ? (TYPE_COLORS[type] as 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'default')
                : 'default'
            }
            className="cursor-pointer"
            onClick={() => toggleType(type)}
          >
            {type}
          </Chip>
        ))}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ArtifactStatus | 'all')}>
        <TabsList>
          <TabsTrigger value="active">
            {t('page.artifacts.active', { count: activeCount })}
          </TabsTrigger>
          <TabsTrigger value="done">
            {t('page.artifacts.done', { count: doneCount })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {loading && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <EmptyState
              message={
                search || activeTypes.size > 0
                  ? t('page.artifacts.noMatch')
                  : t('page.artifacts.noArtifacts')
              }
              action={
                !search && activeTypes.size === 0 ? (
                  <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
                    <Plus size={14} /> {t('page.artifacts.createArtifact')}
                  </Button>
                ) : undefined
              }
            />
          )}

          {!loading && filtered.length > 0 && (
            <div className="mt-4 space-y-6">
              {[...grouped.entries()].map(([feature, items]) => (
                <div key={feature}>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    {feature}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((artifact) => (
                      <ArtifactCard
                        key={artifact.id}
                        artifact={artifact}
                        onClick={() => navigateToDetail(artifact.id)}
                        onArchive={artifact.status === 'active' ? () => setConfirmTarget({ id: artifact.id, action: 'archive' }) : undefined}
                        onDelete={() => setConfirmTarget({ id: artifact.id, action: 'delete' })}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create dialog */}
      <ArtifactFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
      />

      {/* Confirm archive/delete dialog */}
      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => { if (!open) setConfirmTarget(null); }}
        title={confirmTarget?.action === 'archive' ? t('page.artifacts.archiveTitle') : t('page.artifacts.deleteTitle')}
        description={confirmTarget?.action === 'archive' ? t('page.artifacts.archiveDescription') : t('page.artifacts.deleteDescription')}
        confirmLabel={confirmTarget?.action === 'archive' ? t('page.artifacts.archive') : t('common.delete')}
        variant={confirmTarget?.action === 'delete' ? 'destructive' : 'default'}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}
