import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { DraftCard } from '../components/draft-card';
import { DraftFormDialog } from '../components/draft-form-dialog';
import { BlockEditor } from '../../../components/editor';
import { useDraftsStore } from '../stores/drafts-store';
import { useProjectStore } from '../../../stores/project-store';
import { showSuccess, showError } from '../../../lib/toast';
import type { DraftEntry, DraftCategory } from '../../../lib/types';

export function DraftsPage() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const {
    drafts, selectedDraftId, draftContent,
    loading, stale, fetch, selectDraft, clearSelection,
    approveDraft, rejectDraft, addDraft, editDraft, removeDraft,
  } = useDraftsStore();
  const [showAll, setShowAll] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<DraftEntry | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetch(activeProject.path);
    }
  }, [activeProject?.path, stale, fetch]);

  const filtered = useMemo(() => {
    if (showAll) return drafts;
    return drafts.filter((d) => d.status === 'pending');
  }, [drafts, showAll]);

  const pendingCount = drafts.filter((d) => d.status === 'pending').length;

  const handleSelect = (draft: DraftEntry) => {
    if (selectedDraftId === draft.id) {
      clearSelection();
    } else {
      selectDraft(draft);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveDraft(id);
      showSuccess(t('page.drafts.approveSuccess'));
    } catch {
      showError(t('page.drafts.approveError'));
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await rejectDraft(id, reason);
      showSuccess(t('page.drafts.rejectSuccess'));
    } catch {
      showError(t('page.drafts.rejectError'));
    }
  };

  const handleCreate = async (category: DraftCategory, title: string, filename: string, content: string, confidence: number) => {
    try {
      await addDraft(category, title, filename, content, confidence, 'manual');
      showSuccess(t('page.drafts.createSuccess'));
    } catch {
      showError(t('page.drafts.createError'));
      throw new Error('failed');
    }
  };

  const handleEdit = async (category: DraftCategory, title: string, filename: string, content: string, confidence: number) => {
    if (!editEntry) return;
    try {
      await editDraft(editEntry.id, title, content, category, confidence, filename);
      showSuccess(t('page.drafts.updateSuccess'));
    } catch {
      showError(t('page.drafts.updateError'));
      throw new Error('failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await removeDraft(deleteId);
      showSuccess(t('page.drafts.deleteSuccess'));
    } catch {
      showError(t('page.drafts.deleteError'));
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title={t('page.drafts.title')} description={t('page.drafts.description')} />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div>
        <PageHeader title={t('page.drafts.title')} description={t('page.drafts.description')} />
        <div className="mb-4 flex justify-end">
          <Button size="sm" onClick={() => { setEditEntry(undefined); setFormOpen(true); }}>
            <Plus size={14} /> {t('page.drafts.addDraft')}
          </Button>
        </div>
        <EmptyState
          message={t('page.drafts.noDrafts')}
          action={
            <Button size="sm" variant="outline" onClick={() => { setEditEntry(undefined); setFormOpen(true); }}>
              <Plus size={14} /> {t('page.drafts.createFirst')}
            </Button>
          }
        />
        <DraftFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editEntry} onSubmit={handleCreate} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t('page.drafts.title')} description={t('page.drafts.description')} />

      {/* Filter chips + create */}
      <div className="mb-4 flex items-center gap-2">
        <Button size="sm" onClick={() => { setEditEntry(undefined); setFormOpen(true); }}>
          <Plus size={14} /> {t('page.drafts.addDraft')}
        </Button>
        <Chip
          size="sm"
          color={!showAll ? 'accent' : 'default'}
          className="cursor-pointer"
          onClick={() => setShowAll(false)}
        >
          {t('page.drafts.pendingFilter', { count: pendingCount })}
        </Chip>
        <Chip
          size="sm"
          color={showAll ? 'accent' : 'default'}
          className="cursor-pointer"
          onClick={() => setShowAll(true)}
        >
          {t('page.drafts.allFilter', { count: drafts.length })}
        </Chip>
      </div>

      {filtered.length === 0 && (
        <EmptyState message={t('page.drafts.noMatch')} />
      )}

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Draft list */}
        <div className="space-y-2">
          {filtered.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              selected={selectedDraftId === draft.id}
              onSelect={handleSelect}
              onApprove={draft.status === 'pending' ? handleApprove : undefined}
              onReject={draft.status === 'pending' ? handleReject : undefined}
              onEdit={(d) => { setEditEntry(d); setFormOpen(true); }}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>

        {/* Preview panel */}
        {selectedDraftId && (
          <Card className="gap-0 py-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm">{t('page.drafts.preview')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {draftContent === null ? (
                <Skeleton className="mx-4 mb-4 h-40 rounded-lg" />
              ) : (
                <div className="max-h-96 overflow-auto">
                  <BlockEditor initialMarkdown={draftContent} editable={false} />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <DraftFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editEntry}
        onSubmit={editEntry ? handleEdit : handleCreate}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('page.drafts.deleteTitle')}
        description={t('page.drafts.deleteDescription')}
        variant="destructive"
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
      />
    </div>
  );
}
