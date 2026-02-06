import { useEffect, useMemo, useState } from 'react';
import { SearchField, Skeleton, Chip } from '@heroui/react';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { ObservationCard } from '../components/observation-card';
import { useSessionsStore } from '../stores/sessions-store';
import { useProjectStore } from '../../../stores/project-store';
import { listDirectory, readJsonFile } from '../../../lib/tauri';
import { normalizePath } from '../../../lib/utils';
import type { SessionObservation, ObservationType } from '../../../lib/types';

const ALL_TYPES: ObservationType[] = [
  'decision', 'mistake', 'convention', 'pattern',
  'preference', 'insight', 'tool_outcome', 'workflow_outcome',
];

export function ObservationsPage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const { stale, fetchAll } = useSessionsStore();
  const [observations, setObservations] = useState<SessionObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<ObservationType>>(new Set());

  useEffect(() => {
    if (!activeProject?.path) return;
    void (async () => {
      setLoading(true);
      if (stale) await fetchAll(activeProject.path);

      const base = `${normalizePath(activeProject.path)}/.aidd/sessions`;
      const allObs: SessionObservation[] = [];

      for (const status of ['active', 'completed'] as const) {
        try {
          const files = await listDirectory(`${base}/${status}`, ['json']);
          const obsFiles = files.filter((f) => f.name.includes('-observations'));
          const results = await Promise.all(
            obsFiles.map((f) => readJsonFile(f.path) as Promise<SessionObservation[]>),
          );
          for (const arr of results) {
            if (Array.isArray(arr)) allObs.push(...arr);
          }
        } catch {
          // Directory may not exist
        }
      }

      allObs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setObservations(allObs);
      setLoading(false);
    })();
  }, [activeProject?.path, stale, fetchAll]);

  const toggleType = (type: ObservationType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = observations;
    if (activeTypes.size > 0) {
      result = result.filter((o) => activeTypes.has(o.type));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) => o.title.toLowerCase().includes(q) || o.type.toLowerCase().includes(q),
      );
    }
    return result;
  }, [observations, activeTypes, search]);

  return (
    <div>
      <PageHeader title="Observations" description="Typed observations from sessions" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchField aria-label="Search observations" value={search} onChange={setSearch} className="max-w-xs">
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search observations..." />
            {search && <SearchField.ClearButton />}
          </SearchField.Group>
        </SearchField>
        <span className="text-xs text-default-400">{filtered.length} observations</span>
      </div>

      {/* Type filter chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {ALL_TYPES.map((type) => (
          <Chip
            key={type}
            size="sm"
            variant="soft"
            color={activeTypes.has(type) ? 'accent' : 'default'}
            className="cursor-pointer"
            onClick={() => toggleType(type)}
          >
            {type.replace('_', ' ')}
          </Chip>
        ))}
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState message={search || activeTypes.size > 0 ? 'No observations match your filters.' : 'No observations recorded yet.'} />
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((obs) => (
            <ObservationCard key={obs.id} observation={obs} />
          ))}
        </div>
      )}
    </div>
  );
}
