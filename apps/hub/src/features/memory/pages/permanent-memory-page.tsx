import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/empty-state';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DecisionFormDialog } from '../components/decision-form-dialog';
import { MistakeFormDialog } from '../components/mistake-form-dialog';
import { ConventionFormDialog } from '../components/convention-form-dialog';
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

function DecisionsTab() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { decisions, addDecision, editDecision, removeDecision } = usePermanentMemoryStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<DecisionEntry | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async (decision: string, reasoning: string, alternatives?: string[], context?: string) => {
    try {
      await addDecision(decision, reasoning, alternatives, context);
      showSuccess(t('page.memory.decisionCreated'));
    } catch {
      showError(t('page.memory.decisionCreateError'));
      throw new Error('failed');
    }
  };

  const handleEdit = async (decision: string, reasoning: string, alternatives?: string[], context?: string) => {
    if (!editEntry) return;
    try {
      await editDecision(editEntry.id, decision, reasoning, alternatives, context);
      showSuccess(t('page.memory.decisionUpdated'));
    } catch {
      showError(t('page.memory.decisionUpdateError'));
      throw new Error('failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !activeProject?.path) return;
    try {
      await removeDecision(activeProject.path, deleteId);
      showSuccess(t('page.memory.decisionDeleted'));
    } catch {
      showError(t('page.memory.decisionDeleteError'));
    }
  };

  return (
    <>
      <div className="mb-3 mt-3 flex justify-end">
        <Button size="sm" onClick={() => { setEditEntry(undefined); setFormOpen(true); }}>
          <Plus size={14} /> {t('page.memory.addDecision')}
        </Button>
      </div>

      {decisions.length === 0 ? (
        <EmptyState
          message={t('page.memory.noDecisions')}
          action={
            <Button size="sm" variant="outline" onClick={() => { setEditEntry(undefined); setFormOpen(true); }}>
              <Plus size={14} /> {t('page.memory.createFirstDecision')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {decisions.map((d) => (
            <Card key={d.id} className="border border-border bg-muted/50">
              <CardHeader className="cursor-pointer gap-2" onClick={() => toggle(d.id)}>
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{d.decision}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(d.createdAt)}</span>
                </div>
              </CardHeader>
              {expanded.has(d.id) && (
                <CardContent className="pt-0">
                  <p className="mb-2 text-xs text-muted-foreground">{d.reasoning}</p>
                  {d.alternatives && d.alternatives.length > 0 && (
                    <div className="mb-2">
                      <span className="text-[10px] font-medium uppercase text-muted-foreground">{t('page.memory.alternatives')}</span>
                      <ul className="ml-3 list-inside list-disc text-xs text-muted-foreground">
                        {d.alternatives.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                  )}
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditEntry(d); setFormOpen(true); }}>
                      <Pencil size={14} /> {t('common.edit')}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(d.id)}>
                      <Trash2 size={14} /> {t('common.remove')}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <DecisionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editEntry}
        onSubmit={editEntry ? handleEdit : handleCreate}
      />

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

function MistakesTab() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { mistakes, addMistake, editMistake, removeMistake } = usePermanentMemoryStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<MistakeEntry | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async (error: string, rootCause: string, fix: string, prevention: string) => {
    try {
      await addMistake(error, rootCause, fix, prevention);
      showSuccess(t('page.memory.mistakeCreated'));
    } catch {
      showError(t('page.memory.mistakeCreateError'));
      throw new Error('failed');
    }
  };

  const handleEdit = async (error: string, rootCause: string, fix: string, prevention: string) => {
    if (!editEntry) return;
    try {
      await editMistake(editEntry.id, error, rootCause, fix, prevention);
      showSuccess(t('page.memory.mistakeUpdated'));
    } catch {
      showError(t('page.memory.mistakeUpdateError'));
      throw new Error('failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !activeProject?.path) return;
    try {
      await removeMistake(activeProject.path, deleteId);
      showSuccess(t('page.memory.mistakeDeleted'));
    } catch {
      showError(t('page.memory.mistakeDeleteError'));
    }
  };

  return (
    <>
      <div className="mb-3 mt-3 flex justify-end">
        <Button size="sm" onClick={() => { setEditEntry(undefined); setFormOpen(true); }}>
          <Plus size={14} /> {t('page.memory.addMistake')}
        </Button>
      </div>

      {mistakes.length === 0 ? (
        <EmptyState
          message={t('page.memory.noMistakes')}
          action={
            <Button size="sm" variant="outline" onClick={() => { setEditEntry(undefined); setFormOpen(true); }}>
              <Plus size={14} /> {t('page.memory.createFirstMistake')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {mistakes.map((m) => (
            <Card key={m.id} className="border border-border bg-muted/50">
              <CardHeader className="cursor-pointer gap-2" onClick={() => toggle(m.id)}>
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
                  <p className="mb-1"><span className="font-medium text-foreground">{t('page.memory.rootCause')}</span> {m.rootCause}</p>
                  <p className="mb-1"><span className="font-medium text-foreground">{t('page.memory.fix')}</span> {m.fix}</p>
                  <p className="mb-2"><span className="font-medium text-foreground">{t('page.memory.prevention')}</span> {m.prevention}</p>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditEntry(m); setFormOpen(true); }}>
                      <Pencil size={14} /> {t('common.edit')}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(m.id)}>
                      <Trash2 size={14} /> {t('common.remove')}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <MistakeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editEntry}
        onSubmit={editEntry ? handleEdit : handleCreate}
      />

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

function ConventionsTab() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { conventions, addConvention, editConvention, removeConvention } = usePermanentMemoryStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ConventionEntry | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async (convention: string, example: string, rationale?: string) => {
    try {
      await addConvention(convention, example, rationale);
      showSuccess(t('page.memory.conventionCreated'));
    } catch {
      showError(t('page.memory.conventionCreateError'));
      throw new Error('failed');
    }
  };

  const handleEdit = async (convention: string, example: string, rationale?: string) => {
    if (!editEntry) return;
    try {
      await editConvention(editEntry.id, convention, example, rationale);
      showSuccess(t('page.memory.conventionUpdated'));
    } catch {
      showError(t('page.memory.conventionUpdateError'));
      throw new Error('failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !activeProject?.path) return;
    try {
      await removeConvention(activeProject.path, deleteId);
      showSuccess(t('page.memory.conventionDeleted'));
    } catch {
      showError(t('page.memory.conventionDeleteError'));
    }
  };

  return (
    <>
      <div className="mb-3 mt-3 flex justify-end">
        <Button size="sm" onClick={() => { setEditEntry(undefined); setFormOpen(true); }}>
          <Plus size={14} /> {t('page.memory.addConvention')}
        </Button>
      </div>

      {conventions.length === 0 ? (
        <EmptyState
          message={t('page.memory.noConventions')}
          action={
            <Button size="sm" variant="outline" onClick={() => { setEditEntry(undefined); setFormOpen(true); }}>
              <Plus size={14} /> {t('page.memory.createFirstConvention')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {conventions.map((c) => (
            <Card key={c.id} className="border border-border bg-muted/50">
              <CardHeader className="cursor-pointer gap-2" onClick={() => toggle(c.id)}>
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{c.convention}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(c.createdAt)}</span>
                </div>
              </CardHeader>
              {expanded.has(c.id) && (
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  <p className="mb-1"><span className="font-medium text-foreground">{t('page.memory.example')}</span> {c.example}</p>
                  {c.rationale && (
                    <p className="mb-2"><span className="font-medium text-foreground">{t('page.memory.rationale')}</span> {c.rationale}</p>
                  )}
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditEntry(c); setFormOpen(true); }}>
                      <Pencil size={14} /> {t('common.edit')}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(c.id)}>
                      <Trash2 size={14} /> {t('common.remove')}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConventionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editEntry}
        onSubmit={editEntry ? handleEdit : handleCreate}
      />

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
