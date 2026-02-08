import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { ObservationCard } from '../components/observation-card';
import { ObservationFormDialog } from '../components/observation-form-dialog';
import { useObservationsStore } from '../stores/observations-store';
import { useProjectStore } from '../../../stores/project-store';
import { showSuccess, showError } from '../../../lib/toast';
import type { SessionObservation, ObservationType } from '../../../lib/types';

const ALL_TYPES: ObservationType[] = [
  'decision', 'mistake', 'convention', 'pattern',
  'preference', 'insight', 'tool_outcome', 'workflow_outcome',
];

export function ObservationsPage() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { observations, loading, stale, fetch, addObservation, editObservation, removeObservation } = useObservationsStore();
  const [search, setSearch] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<ObservationType>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<SessionObservation | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetch();
    }
  }, [activeProject?.path, stale, fetch]);

  const toggleType = (type: ObservationType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = observations;
    if (activeTypes.size > 0) {
      result = result.filter((o) => activeTypes.has(o.type));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) => o.title.toLowerCase().includes(q) || o.type.toLowerCase().includes(q),
      );
    }
    return result;
  }, [observations, activeTypes, search]);

  const handleCreate = async (obsType: ObservationType, title: string, narrative?: string) => {
    try {
      await addObservation('manual', obsType, title, narrative);
      showSuccess(t('page.observations.created'));
    } catch {
      showError(t('page.observations.createError'));
      throw new Error('failed');
    }
  };

  const handleEdit = async (obsType: ObservationType, title: string, narrative?: string, facts?: string, concepts?: string, filesRead?: string, filesModified?: string, discoveryTokens?: number) => {
    if (!editEntry) return;
    try {
      await editObservation(editEntry.id, obsType, title, narrative, facts, concepts, filesRead, filesModified, discoveryTokens);
      showSuccess(t('page.observations.updated'));
    } catch {
      showError(t('page.observations.updateError'));
      throw new Error('failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await removeObservation(deleteId);
      showSuccess(t('page.observations.deleted'));
    } catch {
      showError(t('page.observations.deleteError'));
    }
  };

  return (
    <div>
      <PageHeader title={t('page.observations.title')} description={t('page.observations.description')} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('page.observations.searchPlaceholder')}
          className="max-w-xs"
        />
        <span className="text-xs text-muted-foreground">{t('page.observations.count', { count: filtered.length })}</span>
        <div className="ml-auto">
          <Button size="sm" onClick={() => { setEditEntry(undefined); setFormOpen(true); }}>
            <Plus size={14} /> {t('page.observations.addObservation')}
          </Button>
        </div>
      </div>

      {/* Type filter chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {ALL_TYPES.map((type) => (
          <Chip
            key={type}
            size="sm"
            color={activeTypes.has(type) ? 'accent' : 'default'}
            className="cursor-pointer"
            onClick={() => toggleType(type)}
          >
            {type.replace('_', ' ')}
          </Chip>
        ))}
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState
          message={search || activeTypes.size > 0 ? t('page.observations.noMatch') : t('page.observations.noObservations')}
          action={!search && activeTypes.size === 0 ? (
            <Button size="sm" variant="outline" onClick={() => { setEditEntry(undefined); setFormOpen(true); }}>
              <Plus size={14} /> {t('page.observations.createFirst')}
            </Button>
          ) : undefined}
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((obs) => (
            <ObservationCard
              key={obs.id}
              observation={obs}
              onEdit={(o) => { setEditEntry(o); setFormOpen(true); }}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      <ObservationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editEntry}
        onSubmit={editEntry ? handleEdit : handleCreate}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('page.observations.deleteTitle')}
        description={t('page.observations.deleteDescription')}
        variant="destructive"
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
      />
    </div>
  );
}
