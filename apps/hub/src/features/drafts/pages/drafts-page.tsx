import { useEffect, useMemo, useState } from 'react';
import { Skeleton, Chip } from '@heroui/react';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { DraftCard } from '../components/draft-card';
import { useDraftsStore } from '../stores/drafts-store';
import { useProjectStore } from '../../../stores/project-store';
import type { DraftEntry } from '../../../lib/types';

export function DraftsPage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const {
    drafts, selectedDraftId, draftContent,
    loading, stale, fetch, selectDraft, clearSelection,
  } = useDraftsStore();
  const [showAll, setShowAll] = useState(false);

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
    if (!activeProject?.path) return;
    if (selectedDraftId === draft.id) {
      clearSelection();
    } else {
      void selectDraft(activeProject.path, draft);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Drafts" description="Pending artifact drafts" />
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
        <PageHeader title="Drafts" description="Pending artifact drafts" />
        <EmptyState message="No drafts yet. The evolution engine will create drafts when candidates reach the draft threshold." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Drafts" description="Pending artifact drafts" />

      {/* Filter chips */}
      <div className="mb-4 flex items-center gap-2">
        <Chip
          size="sm"
          variant="soft"
          color={!showAll ? 'accent' : 'default'}
          className="cursor-pointer"
          onClick={() => setShowAll(false)}
        >
          Pending ({pendingCount})
        </Chip>
        <Chip
          size="sm"
          variant="soft"
          color={showAll ? 'accent' : 'default'}
          className="cursor-pointer"
          onClick={() => setShowAll(true)}
        >
          All ({drafts.length})
        </Chip>
      </div>

      {filtered.length === 0 && (
        <EmptyState message="No drafts match the current filter." />
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
            />
          ))}
        </div>

        {/* Preview panel */}
        {selectedDraftId && (
          <div className="rounded-xl border border-default-200 bg-default-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-default-600">Draft Preview</h3>
            {draftContent === null ? (
              <Skeleton className="h-40 rounded-lg" />
            ) : (
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-default-100 p-3 text-xs text-default-600">
                {draftContent}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
