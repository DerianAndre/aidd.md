import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EditableList } from '@/components/editable-list';
import { usePermanentMemoryStore } from '../stores/permanent-memory-store';
import { useProjectStore } from '@/stores/project-store';
import { formatDate } from '@/lib/utils';
import { showSuccess, showError } from '@/lib/toast';
import type { DecisionEntry, MistakeEntry, ConventionEntry } from '@/lib/types';

export function PermanentMemoryPage() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { decisions, mistakes, conventions, loading, stale, fetch } = usePermanentMemoryStore();

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetch(activeProject.path);
    }
  }, [activeProject?.path, stale, fetch]);

  return (
    <div>
      <PageHeader title={t('page.memory.title')} description={t('page.memory.description')} />

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-64 rounded-lg" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {!loading && (
        <Tabs defaultValue="decisions">
          <TabsList aria-label="Memory categories">
            <TabsTrigger value="decisions">{t('page.memory.decisions', { count: decisions.length })}</TabsTrigger>
            <TabsTrigger value="mistakes">{t('page.memory.mistakes', { count: mistakes.length })}</TabsTrigger>
            <TabsTrigger value="conventions">{t('page.memory.conventions', { count: conventions.length })}</TabsTrigger>
          </TabsList>

          <TabsContent value="decisions">
            <DecisionsTab />
          </TabsContent>
          <TabsContent value="mistakes">
            <MistakesTab />
          </TabsContent>
          <TabsContent value="conventions">
            <ConventionsTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Decisions Tab — inline edit
// ---------------------------------------------------------------------------

function DecisionsTab() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { decisions, addDecision, editDecision, removeDecision } = usePermanentMemoryStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Draft state for inline editing
  const [dDecision, setDDecision] = useState('');
  const [dReasoning, setDReasoning] = useState('');
  const [dAlternatives, setDAlternatives] = useState<string[]>([]);
  const [dContext, setDContext] = useState('');

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startCreate = () => {
    setDDecision('');
    setDReasoning('');
    setDAlternatives([]);
    setDContext('');
    setCreating(true);
    setEditingId(null);
  };

  const startEdit = (d: DecisionEntry) => {
    setDDecision(d.decision);
    setDReasoning(d.reasoning);
    setDAlternatives([...(d.alternatives ?? [])]);
    setDContext(d.context ?? '');
    setEditingId(d.id);
    setCreating(false);
    setExpanded((prev) => new Set(prev).add(d.id));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCreating(false);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const alts = dAlternatives.length > 0 ? dAlternatives : undefined;
      const ctx = dContext || undefined;
      if (creating) {
        await addDecision(dDecision, dReasoning, alts, ctx);
        showSuccess(t('page.memory.decisionCreated'));
        setCreating(false);
      } else if (editingId) {
        await editDecision(editingId, dDecision, dReasoning, alts, ctx);
        showSuccess(t('page.memory.decisionUpdated'));
        setEditingId(null);
      }
    } catch {
      showError(creating ? t('page.memory.decisionCreateError') : t('page.memory.decisionUpdateError'));
    } finally {
      setSaving(false);
    }
  }, [creating, editingId, dDecision, dReasoning, dAlternatives, dContext, addDecision, editDecision, t]);

  const handleDelete = async () => {
    if (!deleteId || !activeProject?.path) return;
    try {
      await removeDecision(activeProject.path, deleteId);
      showSuccess(t('page.memory.decisionDeleted'));
    } catch {
      showError(t('page.memory.decisionDeleteError'));
    }
  };

  // Escape key cancels
  useEffect(() => {
    if (!editingId && !creating) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelEdit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingId, creating]);

  const renderEditForm = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t('page.memory.decisionLabel')}</Label>
        <Input value={dDecision} onChange={(e) => setDDecision(e.target.value)} placeholder="What was decided..." />
      </div>
      <div className="space-y-1.5">
        <Label>{t('page.memory.reasoningLabel')}</Label>
        <Textarea value={dReasoning} onChange={(e) => setDReasoning(e.target.value)} placeholder="Why this decision was made..." />
      </div>
      <div className="space-y-1.5">
        <EditableList
          label={t('page.memory.alternatives')}
          items={dAlternatives}
          onChange={setDAlternatives}
          editing={true}
          placeholder="Add alternative..."
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t('page.memory.contextLabel')}</Label>
        <Textarea value={dContext} onChange={(e) => setDContext(e.target.value)} placeholder="Additional context..." />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" disabled={!dDecision.trim() || !dReasoning.trim() || saving} onClick={handleSave}>
          <Save size={14} /> {saving ? t('common.saving') : t('common.save')}
        </Button>
        <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-3 mt-3 flex justify-end">
        <Button size="sm" onClick={startCreate} disabled={creating}>
          <Plus size={14} /> {t('page.memory.addDecision')}
        </Button>
      </div>

      {/* Create form — inline card at top */}
      {creating && (
        <Card className="mb-3 border border-accent bg-accent/5">
          <CardContent>
            {renderEditForm()}
          </CardContent>
        </Card>
      )}

      {decisions.length === 0 && !creating ? (
        <EmptyState
          message={t('page.memory.noDecisions')}
          action={
            <Button size="sm" variant="outline" onClick={startCreate}>
              <Plus size={14} /> {t('page.memory.createFirstDecision')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {decisions.map((d) => (
            <Card key={d.id} className="border border-border bg-muted/50">
              <CardHeader className="cursor-pointer gap-2" onClick={() => editingId !== d.id && toggle(d.id)}>
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{d.decision}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(d.createdAt)}</span>
                </div>
              </CardHeader>
              {expanded.has(d.id) && (
                <CardContent className="pt-0">
                  {editingId === d.id ? (
                    renderEditForm()
                  ) : (
                    <>
                      <p className="mb-2 text-xs text-muted-foreground">{d.reasoning}</p>
                      {d.alternatives && d.alternatives.length > 0 && (
                        <div className="mb-2">
                          <span className="text-[10px] font-medium uppercase text-muted-foreground">{t('page.memory.alternatives')}</span>
                          <ul className="ml-3 list-inside list-disc text-xs text-muted-foreground">
                            {d.alternatives.map((a, i) => <li key={i}>{a}</li>)}
                          </ul>
                        </div>
                      )}
                      {d.context && (
                        <p className="mb-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{t('page.memory.contextLabel')}: </span>
                          {d.context}
                        </p>
                      )}
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(d)}>
                          <Pencil size={14} /> {t('common.edit')}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(d.id)}>
                          <Trash2 size={14} /> {t('common.remove')}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('page.memory.deleteDecisionTitle')}
        description={t('page.memory.deleteDecisionDesc')}
        variant="destructive"
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Mistakes Tab — inline edit
// ---------------------------------------------------------------------------

function MistakesTab() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { mistakes, addMistake, editMistake, removeMistake } = usePermanentMemoryStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Draft state
  const [dError, setDError] = useState('');
  const [dRootCause, setDRootCause] = useState('');
  const [dFix, setDFix] = useState('');
  const [dPrevention, setDPrevention] = useState('');

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startCreate = () => {
    setDError('');
    setDRootCause('');
    setDFix('');
    setDPrevention('');
    setCreating(true);
    setEditingId(null);
  };

  const startEdit = (m: MistakeEntry) => {
    setDError(m.error);
    setDRootCause(m.rootCause);
    setDFix(m.fix);
    setDPrevention(m.prevention);
    setEditingId(m.id);
    setCreating(false);
    setExpanded((prev) => new Set(prev).add(m.id));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCreating(false);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (creating) {
        await addMistake(dError, dRootCause, dFix, dPrevention);
        showSuccess(t('page.memory.mistakeCreated'));
        setCreating(false);
      } else if (editingId) {
        await editMistake(editingId, dError, dRootCause, dFix, dPrevention);
        showSuccess(t('page.memory.mistakeUpdated'));
        setEditingId(null);
      }
    } catch {
      showError(creating ? t('page.memory.mistakeCreateError') : t('page.memory.mistakeUpdateError'));
    } finally {
      setSaving(false);
    }
  }, [creating, editingId, dError, dRootCause, dFix, dPrevention, addMistake, editMistake, t]);

  const handleDelete = async () => {
    if (!deleteId || !activeProject?.path) return;
    try {
      await removeMistake(activeProject.path, deleteId);
      showSuccess(t('page.memory.mistakeDeleted'));
    } catch {
      showError(t('page.memory.mistakeDeleteError'));
    }
  };

  useEffect(() => {
    if (!editingId && !creating) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelEdit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingId, creating]);

  const renderEditForm = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t('page.memory.errorLabel')}</Label>
        <Input value={dError} onChange={(e) => setDError(e.target.value)} placeholder="Error message or description..." />
      </div>
      <div className="space-y-1.5">
        <Label>{t('page.memory.rootCause')}</Label>
        <Textarea value={dRootCause} onChange={(e) => setDRootCause(e.target.value)} placeholder="What caused it..." />
      </div>
      <div className="space-y-1.5">
        <Label>{t('page.memory.fix')}</Label>
        <Textarea value={dFix} onChange={(e) => setDFix(e.target.value)} placeholder="How it was fixed..." />
      </div>
      <div className="space-y-1.5">
        <Label>{t('page.memory.prevention')}</Label>
        <Textarea value={dPrevention} onChange={(e) => setDPrevention(e.target.value)} placeholder="How to prevent it..." />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" disabled={!dError.trim() || !dRootCause.trim() || !dFix.trim() || !dPrevention.trim() || saving} onClick={handleSave}>
          <Save size={14} /> {saving ? t('common.saving') : t('common.save')}
        </Button>
        <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-3 mt-3 flex justify-end">
        <Button size="sm" onClick={startCreate} disabled={creating}>
          <Plus size={14} /> {t('page.memory.addMistake')}
        </Button>
      </div>

      {creating && (
        <Card className="mb-3 border border-accent bg-accent/5">
          <CardContent>
            {renderEditForm()}
          </CardContent>
        </Card>
      )}

      {mistakes.length === 0 && !creating ? (
        <EmptyState
          message={t('page.memory.noMistakes')}
          action={
            <Button size="sm" variant="outline" onClick={startCreate}>
              <Plus size={14} /> {t('page.memory.createFirstMistake')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {mistakes.map((m) => (
            <Card key={m.id} className="border border-border bg-muted/50">
              <CardHeader className="cursor-pointer gap-2" onClick={() => editingId !== m.id && toggle(m.id)}>
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{m.error}</span>
                  <div className="flex items-center gap-2">
                    <Chip size="sm" color={m.occurrences > 2 ? 'danger' : 'warning'}>
                      {m.occurrences}x
                    </Chip>
                    <span className="text-[10px] text-muted-foreground">{formatDate(m.lastSeenAt)}</span>
                  </div>
                </div>
              </CardHeader>
              {expanded.has(m.id) && (
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  {editingId === m.id ? (
                    renderEditForm()
                  ) : (
                    <>
                      <p className="mb-1"><span className="font-medium text-foreground">{t('page.memory.rootCause')}</span> {m.rootCause}</p>
                      <p className="mb-1"><span className="font-medium text-foreground">{t('page.memory.fix')}</span> {m.fix}</p>
                      <p className="mb-2"><span className="font-medium text-foreground">{t('page.memory.prevention')}</span> {m.prevention}</p>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(m)}>
                          <Pencil size={14} /> {t('common.edit')}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(m.id)}>
                          <Trash2 size={14} /> {t('common.remove')}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('page.memory.deleteMistakeTitle')}
        description={t('page.memory.deleteMistakeDesc')}
        variant="destructive"
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Conventions Tab — inline edit
// ---------------------------------------------------------------------------

function ConventionsTab() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { conventions, addConvention, editConvention, removeConvention } = usePermanentMemoryStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Draft state
  const [dConvention, setDConvention] = useState('');
  const [dExample, setDExample] = useState('');
  const [dRationale, setDRationale] = useState('');

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startCreate = () => {
    setDConvention('');
    setDExample('');
    setDRationale('');
    setCreating(true);
    setEditingId(null);
  };

  const startEdit = (c: ConventionEntry) => {
    setDConvention(c.convention);
    setDExample(c.example);
    setDRationale(c.rationale ?? '');
    setEditingId(c.id);
    setCreating(false);
    setExpanded((prev) => new Set(prev).add(c.id));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCreating(false);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const rat = dRationale || undefined;
      if (creating) {
        await addConvention(dConvention, dExample, rat);
        showSuccess(t('page.memory.conventionCreated'));
        setCreating(false);
      } else if (editingId) {
        await editConvention(editingId, dConvention, dExample, rat);
        showSuccess(t('page.memory.conventionUpdated'));
        setEditingId(null);
      }
    } catch {
      showError(creating ? t('page.memory.conventionCreateError') : t('page.memory.conventionUpdateError'));
    } finally {
      setSaving(false);
    }
  }, [creating, editingId, dConvention, dExample, dRationale, addConvention, editConvention, t]);

  const handleDelete = async () => {
    if (!deleteId || !activeProject?.path) return;
    try {
      await removeConvention(activeProject.path, deleteId);
      showSuccess(t('page.memory.conventionDeleted'));
    } catch {
      showError(t('page.memory.conventionDeleteError'));
    }
  };

  useEffect(() => {
    if (!editingId && !creating) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelEdit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingId, creating]);

  const renderEditForm = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t('page.memory.conventionLabel')}</Label>
        <Input value={dConvention} onChange={(e) => setDConvention(e.target.value)} placeholder="Convention to follow..." />
      </div>
      <div className="space-y-1.5">
        <Label>{t('page.memory.example')}</Label>
        <Textarea value={dExample} onChange={(e) => setDExample(e.target.value)} placeholder="Example of the convention..." />
      </div>
      <div className="space-y-1.5">
        <Label>{t('page.memory.rationale')}</Label>
        <Textarea value={dRationale} onChange={(e) => setDRationale(e.target.value)} placeholder="Why this convention exists..." />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" disabled={!dConvention.trim() || !dExample.trim() || saving} onClick={handleSave}>
          <Save size={14} /> {saving ? t('common.saving') : t('common.save')}
        </Button>
        <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-3 mt-3 flex justify-end">
        <Button size="sm" onClick={startCreate} disabled={creating}>
          <Plus size={14} /> {t('page.memory.addConvention')}
        </Button>
      </div>

      {creating && (
        <Card className="mb-3 border border-accent bg-accent/5">
          <CardContent>
            {renderEditForm()}
          </CardContent>
        </Card>
      )}

      {conventions.length === 0 && !creating ? (
        <EmptyState
          message={t('page.memory.noConventions')}
          action={
            <Button size="sm" variant="outline" onClick={startCreate}>
              <Plus size={14} /> {t('page.memory.createFirstConvention')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {conventions.map((c) => (
            <Card key={c.id} className="border border-border bg-muted/50">
              <CardHeader className="cursor-pointer gap-2" onClick={() => editingId !== c.id && toggle(c.id)}>
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{c.convention}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(c.createdAt)}</span>
                </div>
              </CardHeader>
              {expanded.has(c.id) && (
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  {editingId === c.id ? (
                    renderEditForm()
                  ) : (
                    <>
                      <p className="mb-1"><span className="font-medium text-foreground">{t('page.memory.example')}</span> {c.example}</p>
                      {c.rationale && (
                        <p className="mb-2"><span className="font-medium text-foreground">{t('page.memory.rationale')}</span> {c.rationale}</p>
                      )}
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>
                          <Pencil size={14} /> {t('common.edit')}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(c.id)}>
                          <Trash2 size={14} /> {t('common.remove')}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('page.memory.deleteConventionTitle')}
        description={t('page.memory.deleteConventionDesc')}
        variant="destructive"
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
      />
    </>
  );
}
