import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/ui/chip';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { DraftCard } from '../components/draft-card';
import { useDraftsStore } from '../stores/drafts-store';
import { useProjectStore } from '../../../stores/project-store';
import type { DraftEntry } from '../../../lib/types';

export function DraftsPage() {
  const { t } = useTranslation();
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
        <EmptyState message={t('page.drafts.noDrafts')} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t('page.drafts.title')} description={t('page.drafts.description')} />

      {/* Filter chips */}
      <div className="mb-4 flex items-center gap-2">
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
            />
          ))}
        </div>

        {/* Preview panel */}
        {selectedDraftId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('page.drafts.preview')}</CardTitle>
            </CardHeader>
            <CardContent>
              {draftContent === null ? (
                <Skeleton className="h-40 rounded-lg" />
              ) : (
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs text-foreground">
                  {draftContent}
                </pre>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
