import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Save, Pencil } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { DraftCard } from '../components/draft-card';
import { BlockEditor } from '../../../components/editor';
import { useDraftsStore } from '../stores/drafts-store';
import { useProjectStore } from '../../../stores/project-store';
import { showSuccess, showError } from '../../../lib/toast';
import type { DraftEntry, DraftCategory } from '../../../lib/types';

const CATEGORY_OPTIONS: { label: string; value: DraftCategory }[] = [
  { label: 'Rules', value: 'rules' },
  { label: 'Knowledge', value: 'knowledge' },
  { label: 'Skills', value: 'skills' },
  { label: 'Workflows', value: 'workflows' },
];

export function DraftsPage() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const {
    drafts, selectedDraftId, draftContent,
    loading, stale, fetch, selectDraft, clearSelection,
    approveDraft, rejectDraft, addDraft, editDraft, removeDraft,
  } = useDraftsStore();
  const [showAll, setShowAll] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Inline create state (renders as a card at top of list)
  const [creating, setCreating] = useState(false);
  const [cCategory, setCCategory] = useState<DraftCategory>('rules');
  const [cTitle, setCTitle] = useState('');
  const [cFilename, setCFilename] = useState('');
  const [cContent, setCContent] = useState('');
  const [cConfidence, setCConfidence] = useState('50');

  // Right pane edit state
  const [paneEditing, setPaneEditing] = useState(false);
  const [pCategory, setPCategory] = useState<DraftCategory>('rules');
  const [pTitle, setPTitle] = useState('');
  const [pFilename, setPFilename] = useState('');
  const [pContent, setPContent] = useState('');
  const [pConfidence, setPConfidence] = useState('50');
  const [saving, setSaving] = useState(false);

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

  const selectedDraft = useMemo(() => {
    if (!selectedDraftId) return null;
    return drafts.find((d) => d.id === selectedDraftId) ?? null;
  }, [drafts, selectedDraftId]);

  const handleSelect = (draft: DraftEntry) => {
    if (selectedDraftId === draft.id) {
      clearSelection();
      setPaneEditing(false);
    } else {
      selectDraft(draft);
      setPaneEditing(false);
    }
  };

  // --- Create flow ---
  const startCreate = () => {
    setCCategory('rules');
    setCTitle('');
    setCFilename('');
    setCContent('');
    setCConfidence('50');
    setCreating(true);
  };

  const cancelCreate = () => setCreating(false);

  const handleCreate = useCallback(async () => {
    setSaving(true);
    try {
      await addDraft(cCategory, cTitle, cFilename, cContent, Number(cConfidence) || 50, 'manual');
      showSuccess(t('page.drafts.createSuccess'));
      setCreating(false);
    } catch {
      showError(t('page.drafts.createError'));
    } finally {
      setSaving(false);
    }
  }, [cCategory, cTitle, cFilename, cContent, cConfidence, addDraft, t]);

  // --- Pane edit flow ---
  const startPaneEdit = () => {
    if (!selectedDraft) return;
    setPCategory(selectedDraft.category);
    setPTitle(selectedDraft.title);
    setPFilename(selectedDraft.filename);
    setPContent(selectedDraft.content ?? '');
    setPConfidence(String(selectedDraft.confidence));
    setPaneEditing(true);
  };

  const cancelPaneEdit = () => setPaneEditing(false);

  const handlePaneEditSave = useCallback(async () => {
    if (!selectedDraftId) return;
    setSaving(true);
    try {
      await editDraft(selectedDraftId, pTitle, pContent, pCategory, Number(pConfidence) || 50, pFilename);
      showSuccess(t('page.drafts.updateSuccess'));
      setPaneEditing(false);
    } catch {
      showError(t('page.drafts.updateError'));
    } finally {
      setSaving(false);
    }
  }, [selectedDraftId, pTitle, pContent, pCategory, pConfidence, pFilename, editDraft, t]);

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

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await removeDraft(deleteId);
      showSuccess(t('page.drafts.deleteSuccess'));
      if (deleteId === selectedDraftId) {
        clearSelection();
        setPaneEditing(false);
      }
    } catch {
      showError(t('page.drafts.deleteError'));
    }
  };

  // Escape key cancels
  useEffect(() => {
    if (!creating && !paneEditing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (creating) cancelCreate();
        if (paneEditing) cancelPaneEdit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [creating, paneEditing]);

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

  return (
    <div>
      <PageHeader title={t('page.drafts.title')} description={t('page.drafts.description')} />

      {/* Filter chips + create */}
      <div className="mb-4 flex items-center gap-2">
        <Button size="sm" onClick={startCreate} disabled={creating}>
          <Plus size={14} /> {t('page.drafts.addDraft')}
        </Button>
        {drafts.length > 0 && (
          <>
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
          </>
        )}
      </div>

      {/* Create form — inline card at top */}
      {creating && (
        <Card className="mb-4 border border-accent bg-accent/5">
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>{t('page.drafts.categoryLabel')}</Label>
                  <Select value={cCategory} onValueChange={(v) => setCCategory(v as DraftCategory)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('page.drafts.titleLabel')}</Label>
                  <Input value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="Draft title..." />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('page.drafts.filenameLabel')}</Label>
                  <Input value={cFilename} onChange={(e) => setCFilename(e.target.value)} placeholder="my-draft.md" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('page.drafts.confidenceLabel')}</Label>
                <Input type="number" value={cConfidence} onChange={(e) => setCConfidence(e.target.value)} placeholder="50" min={0} max={100} className="max-w-32" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('page.drafts.contentLabel')}</Label>
                <div className="rounded-lg border border-border overflow-hidden">
                  <BlockEditor initialMarkdown={cContent} editable={true} onChange={setCContent} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" disabled={!cTitle.trim() || !cFilename.trim() || saving} onClick={handleCreate}>
                  <Save size={14} /> {saving ? t('common.saving') : t('common.save')}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelCreate} disabled={saving}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {drafts.length === 0 && !creating && (
        <EmptyState
          message={t('page.drafts.noDrafts')}
          action={
            <Button size="sm" variant="outline" onClick={startCreate}>
              <Plus size={14} /> {t('page.drafts.createFirst')}
            </Button>
          }
        />
      )}

      {filtered.length === 0 && drafts.length > 0 && (
        <EmptyState message={t('page.drafts.noMatch')} />
      )}

      {filtered.length > 0 && (
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
                onEdit={(d) => { selectDraft(d); startPaneEdit(); }}
                onDelete={(id) => setDeleteId(id)}
              />
            ))}
          </div>

          {/* Preview / Edit pane */}
          {selectedDraftId && (
            <Card className="gap-0 py-0 overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {paneEditing ? t('page.drafts.editDraft') : t('page.drafts.preview')}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {paneEditing ? (
                      <>
                        <Button size="sm" disabled={!pTitle.trim() || saving} onClick={handlePaneEditSave}>
                          <Save size={14} /> {saving ? t('common.saving') : t('common.save')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelPaneEdit} disabled={saving}>
                          {t('common.cancel')}
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startPaneEdit} aria-label={t('common.edit')}>
                        <Pencil size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {paneEditing ? (
                  <div className="space-y-3 p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>{t('page.drafts.categoryLabel')}</Label>
                        <Select value={pCategory} onValueChange={(v) => setPCategory(v as DraftCategory)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t('page.drafts.titleLabel')}</Label>
                        <Input value={pTitle} onChange={(e) => setPTitle(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>{t('page.drafts.filenameLabel')}</Label>
                        <Input value={pFilename} onChange={(e) => setPFilename(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t('page.drafts.confidenceLabel')}</Label>
                        <Input type="number" value={pConfidence} onChange={(e) => setPConfidence(e.target.value)} min={0} max={100} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('page.drafts.contentLabel')}</Label>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <BlockEditor initialMarkdown={pContent} editable={true} onChange={setPContent} />
                      </div>
                    </div>
                  </div>
                ) : (
                  draftContent === null ? (
                    <Skeleton className="mx-4 mb-4 h-40 rounded-lg" />
                  ) : (
                    <div className="max-h-96 overflow-auto">
                      <BlockEditor initialMarkdown={draftContent} editable={false} />
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
