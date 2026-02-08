import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { CandidateCard } from '../components/candidate-card';
import { EvolutionFormDialog } from '../components/evolution-form-dialog';
import { useEvolutionStore } from '../stores/evolution-store';
import { useProjectStore } from '../../../stores/project-store';
import { showSuccess, showError } from '../../../lib/toast';
import { formatDate } from '../../../lib/utils';
import type { EvolutionAction, EvolutionCandidate, EvolutionType } from '../../../lib/types';

const ACTION_COLORS: Record<EvolutionAction, 'success' | 'accent' | 'warning' | 'danger' | 'default'> = {
  auto_applied: 'success',
  drafted: 'accent',
  pending: 'warning',
  reverted: 'danger',
  rejected: 'danger',
};

const ACTION_KEYS = {
  auto_applied: 'page.evolution.autoApplied' as const,
  drafted: 'page.evolution.drafted' as const,
  pending: 'page.evolution.pending' as const,
  reverted: 'page.evolution.reverted' as const,
  rejected: 'page.evolution.rejected' as const,
} satisfies Record<EvolutionAction, string>;

export function EvolutionPage() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { candidates, logEntries, loading, stale, fetch, approveCandidate, rejectCandidate, createCandidate, updateCandidate, removeCandidate } = useEvolutionStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<EvolutionCandidate | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetch(activeProject.path);
    }
  }, [activeProject?.path, stale, fetch]);

  const handleApprove = async (id: string) => {
    try {
      await approveCandidate(id);
      showSuccess(t('page.evolution.approveSuccess'));
    } catch {
      showError(t('page.evolution.approveError'));
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await rejectCandidate(id, reason);
      showSuccess(t('page.evolution.rejectSuccess'));
    } catch {
      showError(t('page.evolution.rejectError'));
    }
  };

  const handleCreate = async (evoType: EvolutionType, title: string, confidence: number, description: string, suggestedAction: string, modelScope?: string) => {
    try {
      await createCandidate(evoType, title, confidence, { description, suggestedAction, modelScope });
      showSuccess(t('page.evolution.createSuccess'));
    } catch {
      showError(t('page.evolution.createError'));
      throw new Error('failed');
    }
  };

  const handleEdit = async (evoType: EvolutionType, title: string, confidence: number, description: string, suggestedAction: string, modelScope?: string) => {
    if (!editEntry) return;
    try {
      await updateCandidate(editEntry.id, evoType, title, confidence, { description, suggestedAction, modelScope });
      showSuccess(t('page.evolution.updateSuccess'));
    } catch {
      showError(t('page.evolution.updateError'));
      throw new Error('failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await removeCandidate(deleteId);
      showSuccess(t('page.evolution.deleteSuccess'));
    } catch {
      showError(t('page.evolution.deleteError'));
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title={t('page.evolution.title')} description={t('page.evolution.description')} />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const hasCandidates = candidates.length > 0;
  const hasLog = logEntries.length > 0;

  if (!hasCandidates && !hasLog) {
    return (
      <div>
        <PageHeader title={t('page.evolution.title')} description={t('page.evolution.description')} />
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={() => { setEditEntry(undefined); setFormOpen(true); }}>
            <Plus size={14} /> {t('page.evolution.addCandidate')}
          </Button>
        </div>
        <EmptyState
          message={t('page.evolution.noEvolution')}
          action={
            <Button size="sm" variant="outline" onClick={() => { setEditEntry(undefined); setFormOpen(true); }}>
              <Plus size={14} /> {t('page.evolution.createFirst')}
            </Button>
          }
        />
        <EvolutionFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editEntry} onSubmit={handleCreate} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t('page.evolution.title')} description={t('page.evolution.description')} />

      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => { setEditEntry(undefined); setFormOpen(true); }}>
          <Plus size={14} /> {t('page.evolution.addCandidate')}
        </Button>
      </div>

      {/* Pending candidates */}
      {hasCandidates && (
        <section className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {t('page.evolution.pendingCandidates', { count: candidates.length })}
          </h3>
          <div className="space-y-2">
            {candidates.map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                onApprove={handleApprove}
                onReject={handleReject}
                onEdit={(cand) => { setEditEntry(cand); setFormOpen(true); }}
                onDelete={(id) => setDeleteId(id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Evolution log */}
      {hasLog && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {t('page.evolution.evolutionLog', { count: logEntries.length })}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">{t('page.evolution.action')}</th>
                  <th className="px-3 py-2 font-medium">{t('page.evolution.entryTitle')}</th>
                  <th className="px-3 py-2 font-medium">{t('page.evolution.confidence')}</th>
                  <th className="px-3 py-2 font-medium">{t('page.evolution.date')}</th>
                </tr>
              </thead>
              <tbody>
                {logEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-muted last:border-0">
                    <td className="px-3 py-2">
                      <Chip size="sm" color={ACTION_COLORS[entry.action]}>
                        {t(ACTION_KEYS[entry.action])}
                      </Chip>
                    </td>
                    <td className="px-3 py-2 text-foreground">{entry.title}</td>
                    <td className="px-3 py-2 text-muted-foreground">{entry.confidence}%</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDate(entry.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <EvolutionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editEntry}
        onSubmit={editEntry ? handleEdit : handleCreate}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('page.evolution.deleteTitle')}
        description={t('page.evolution.deleteDescription')}
        variant="destructive"
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
      />
    </div>
  );
}
