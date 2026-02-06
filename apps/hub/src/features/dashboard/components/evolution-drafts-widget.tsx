import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight } from 'lucide-react';
import { ConfidenceMeter } from '../../evolution/components/confidence-meter';
import { useEvolutionStore } from '../../evolution/stores/evolution-store';
import { useDraftsStore } from '../../drafts/stores/drafts-store';
import { useProjectStore } from '../../../stores/project-store';
import { ROUTES } from '../../../lib/constants';
import { truncate } from '../../../lib/utils';

export function EvolutionDraftsWidget() {
  const activeProject = useProjectStore((s) => s.activeProject);

  const candidates = useEvolutionStore((s) => s.candidates);
  const evoLoading = useEvolutionStore((s) => s.loading);
  const evoStale = useEvolutionStore((s) => s.stale);
  const fetchEvo = useEvolutionStore((s) => s.fetch);

  const drafts = useDraftsStore((s) => s.drafts);
  const draftsLoading = useDraftsStore((s) => s.loading);
  const draftsStale = useDraftsStore((s) => s.stale);
  const fetchDrafts = useDraftsStore((s) => s.fetch);

  useEffect(() => {
    if (!activeProject?.path) return;
    if (evoStale) void fetchEvo(activeProject.path);
    if (draftsStale) void fetchDrafts(activeProject.path);
  }, [activeProject?.path, evoStale, draftsStale, fetchEvo, fetchDrafts]);

  const pendingDrafts = drafts.filter((d) => d.status === 'pending');
  const topCandidate = candidates[0];
  const topDraft = pendingDrafts[0];
  const loading = evoLoading || draftsLoading;

  return (
    <div className="rounded-xl border border-border bg-muted/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Evolution & Drafts</h3>
      </div>

      {loading ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : candidates.length === 0 && pendingDrafts.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No pending items. Patterns emerge as sessions complete.
        </p>
      ) : (
        <>
          {/* Evolution section */}
          {candidates.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{candidates.length}</span> evolution candidate{candidates.length !== 1 ? 's' : ''}
              </p>
              {topCandidate && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="min-w-0 truncate text-xs text-foreground">
                    {truncate(topCandidate.title, 40)}
                  </span>
                  <ConfidenceMeter value={topCandidate.confidence} />
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          {candidates.length > 0 && pendingDrafts.length > 0 && (
            <div className="my-2 border-t border-border" />
          )}

          {/* Drafts section */}
          {pendingDrafts.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{pendingDrafts.length}</span> pending draft{pendingDrafts.length !== 1 ? 's' : ''}
              </p>
              {topDraft && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="min-w-0 truncate text-xs text-foreground">
                    {truncate(topDraft.title, 40)}
                  </span>
                  <Chip size="sm" color="default">{topDraft.category}</Chip>
                </div>
              )}
            </div>
          )}

          {/* Footer links */}
          <div className="mt-3 flex gap-4 border-t border-border pt-2">
            <Link
              to={ROUTES.EVOLUTION}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Evolution <ArrowRight size={12} />
            </Link>
            <Link
              to={ROUTES.DRAFTS}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Drafts <ArrowRight size={12} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
