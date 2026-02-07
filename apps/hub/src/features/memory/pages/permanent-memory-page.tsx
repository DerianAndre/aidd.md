import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { usePermanentMemoryStore } from '../stores/permanent-memory-store';
import { useProjectStore } from '../../../stores/project-store';
import { formatDate } from '../../../lib/utils';

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
  const { decisions, removeDecision } = usePermanentMemoryStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (decisions.length === 0) return <EmptyState message={t('page.memory.noDecisions')} />;

  return (
    <div className="mt-3 space-y-2">
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
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onClick={() => activeProject?.path && void removeDecision(activeProject.path, d.id)}
                >
                  <Trash2 size={14} /> {t('common.remove')}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

function MistakesTab() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { mistakes, removeMistake } = usePermanentMemoryStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (mistakes.length === 0) return <EmptyState message={t('page.memory.noMistakes')} />;

  return (
    <div className="mt-3 space-y-2">
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
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onClick={() => activeProject?.path && void removeMistake(activeProject.path, m.id)}
                >
                  <Trash2 size={14} /> {t('common.remove')}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

function ConventionsTab() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { conventions, removeConvention } = usePermanentMemoryStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (conventions.length === 0) return <EmptyState message={t('page.memory.noConventions')} />;

  return (
    <div className="mt-3 space-y-2">
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
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onClick={() => activeProject?.path && void removeConvention(activeProject.path, c.id)}
                >
                  <Trash2 size={14} /> {t('common.remove')}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
