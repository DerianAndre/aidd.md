import { useEffect, useState } from 'react';
import { Tabs, Card, Chip, Button, Skeleton } from '@heroui/react';
import { Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { usePermanentMemoryStore } from '../stores/permanent-memory-store';
import { useProjectStore } from '../../../stores/project-store';
import { formatDate } from '../../../lib/utils';

export function PermanentMemoryPage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { decisions, mistakes, conventions, loading, stale, fetch } = usePermanentMemoryStore();

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetch(activeProject.path);
    }
  }, [activeProject?.path, stale, fetch]);

  return (
    <div>
      <PageHeader title="Permanent Memory" description="Decisions, mistakes, and conventions" />

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-64 rounded-lg" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {!loading && (
        <Tabs>
          <Tabs.ListContainer>
            <Tabs.List aria-label="Memory categories">
              <Tabs.Tab id="decisions">Decisions ({decisions.length})<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="mistakes">Mistakes ({mistakes.length})<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="conventions">Conventions ({conventions.length})<Tabs.Indicator /></Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel id="decisions">
            <DecisionsTab />
          </Tabs.Panel>
          <Tabs.Panel id="mistakes">
            <MistakesTab />
          </Tabs.Panel>
          <Tabs.Panel id="conventions">
            <ConventionsTab />
          </Tabs.Panel>
        </Tabs>
      )}
    </div>
  );
}

function DecisionsTab() {
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

  if (decisions.length === 0) return <EmptyState message="No decisions recorded yet." />;

  return (
    <div className="mt-3 space-y-2">
      {decisions.map((d) => (
        <Card key={d.id} className="border border-default-200 bg-default-50">
          <Card.Header className="cursor-pointer gap-2" onClick={() => toggle(d.id)}>
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-medium text-foreground">{d.decision}</span>
              <span className="text-[10px] text-default-400">{formatDate(d.createdAt)}</span>
            </div>
          </Card.Header>
          {expanded.has(d.id) && (
            <Card.Content className="pt-0">
              <p className="mb-2 text-xs text-default-500">{d.reasoning}</p>
              {d.alternatives && d.alternatives.length > 0 && (
                <div className="mb-2">
                  <span className="text-[10px] font-medium uppercase text-default-400">Alternatives:</span>
                  <ul className="ml-3 list-inside list-disc text-xs text-default-500">
                    {d.alternatives.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onPress={() => activeProject?.path && void removeDecision(activeProject.path, d.id)}
                >
                  <Trash2 size={14} /> Remove
                </Button>
              </div>
            </Card.Content>
          )}
        </Card>
      ))}
    </div>
  );
}

function MistakesTab() {
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

  if (mistakes.length === 0) return <EmptyState message="No mistakes recorded yet." />;

  return (
    <div className="mt-3 space-y-2">
      {mistakes.map((m) => (
        <Card key={m.id} className="border border-default-200 bg-default-50">
          <Card.Header className="cursor-pointer gap-2" onClick={() => toggle(m.id)}>
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{m.error}</span>
              <div className="flex items-center gap-2">
                <Chip size="sm" variant="soft" color={m.occurrences > 2 ? 'danger' : 'warning'}>
                  {m.occurrences}x
                </Chip>
                <span className="text-[10px] text-default-400">{formatDate(m.lastSeenAt)}</span>
              </div>
            </div>
          </Card.Header>
          {expanded.has(m.id) && (
            <Card.Content className="pt-0 text-xs text-default-500">
              <p className="mb-1"><span className="font-medium text-foreground">Root cause:</span> {m.rootCause}</p>
              <p className="mb-1"><span className="font-medium text-foreground">Fix:</span> {m.fix}</p>
              <p className="mb-2"><span className="font-medium text-foreground">Prevention:</span> {m.prevention}</p>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onPress={() => activeProject?.path && void removeMistake(activeProject.path, m.id)}
                >
                  <Trash2 size={14} /> Remove
                </Button>
              </div>
            </Card.Content>
          )}
        </Card>
      ))}
    </div>
  );
}

function ConventionsTab() {
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

  if (conventions.length === 0) return <EmptyState message="No conventions recorded yet." />;

  return (
    <div className="mt-3 space-y-2">
      {conventions.map((c) => (
        <Card key={c.id} className="border border-default-200 bg-default-50">
          <Card.Header className="cursor-pointer gap-2" onClick={() => toggle(c.id)}>
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-medium text-foreground">{c.convention}</span>
              <span className="text-[10px] text-default-400">{formatDate(c.createdAt)}</span>
            </div>
          </Card.Header>
          {expanded.has(c.id) && (
            <Card.Content className="pt-0 text-xs text-default-500">
              <p className="mb-1"><span className="font-medium text-foreground">Example:</span> {c.example}</p>
              {c.rationale && (
                <p className="mb-2"><span className="font-medium text-foreground">Rationale:</span> {c.rationale}</p>
              )}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onPress={() => activeProject?.path && void removeConvention(activeProject.path, c.id)}
                >
                  <Trash2 size={14} /> Remove
                </Button>
              </div>
            </Card.Content>
          )}
        </Card>
      ))}
    </div>
  );
}
