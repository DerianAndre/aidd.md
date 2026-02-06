import { useEffect } from 'react';
import { Skeleton, Chip } from '@heroui/react';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { CandidateCard } from '../components/candidate-card';
import { useEvolutionStore } from '../stores/evolution-store';
import { useProjectStore } from '../../../stores/project-store';
import { formatDate } from '../../../lib/utils';
import type { EvolutionAction } from '../../../lib/types';

const ACTION_COLORS: Record<EvolutionAction, 'success' | 'accent' | 'warning' | 'danger' | 'default'> = {
  auto_applied: 'success',
  drafted: 'accent',
  pending: 'warning',
  reverted: 'danger',
  rejected: 'danger',
};

export function EvolutionPage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { candidates, logEntries, loading, stale, fetch } = useEvolutionStore();

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetch(activeProject.path);
    }
  }, [activeProject?.path, stale, fetch]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Evolution" description="Auto-framework mutation candidates" />
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
        <PageHeader title="Evolution" description="Auto-framework mutation candidates" />
        <EmptyState message="No evolution candidates yet. The system will propose mutations after analyzing enough sessions." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Evolution" description="Auto-framework mutation candidates" />

      {/* Pending candidates */}
      {hasCandidates && (
        <section className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-default-600">
            Pending Candidates ({candidates.length})
          </h3>
          <div className="space-y-2">
            {candidates.map((c) => (
              <CandidateCard key={c.id} candidate={c} />
            ))}
          </div>
        </section>
      )}

      {/* Evolution log */}
      {hasLog && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-default-600">
            Evolution Log ({logEntries.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-default-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-default-200 bg-default-100 text-left text-default-500">
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Confidence</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {logEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-default-100 last:border-0">
                    <td className="px-3 py-2">
                      <Chip size="sm" variant="soft" color={ACTION_COLORS[entry.action]}>
                        {entry.action.replace(/_/g, ' ')}
                      </Chip>
                    </td>
                    <td className="px-3 py-2 text-foreground">{entry.title}</td>
                    <td className="px-3 py-2 text-default-500">{entry.confidence}%</td>
                    <td className="px-3 py-2 text-default-400">{formatDate(entry.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
