import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/ui/chip';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { ObservationCard } from '../components/observation-card';
import { useProjectStore } from '../../../stores/project-store';
import { listAllObservations } from '../../../lib/tauri';
import type { SessionObservation, ObservationType } from '../../../lib/types';

const STALE_TTL = 30_000;

const ALL_TYPES: ObservationType[] = [
  'decision', 'mistake', 'convention', 'pattern',
  'preference', 'insight', 'tool_outcome', 'workflow_outcome',
];

export function ObservationsPage() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const [observations, setObservations] = useState<SessionObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<ObservationType>>(new Set());
  const [lastFetchedAt, setLastFetchedAt] = useState(0);

  const fetchObservations = useCallback(async () => {
    if (!activeProject?.path) return;
    const isExpired = Date.now() - lastFetchedAt > STALE_TTL;
    if (!isExpired && observations.length > 0) return;

    setLoading(true);
    try {
      const raw = await listAllObservations(500);
      const allObs = ((raw ?? []) as SessionObservation[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setObservations(allObs);
      setLastFetchedAt(Date.now());
    } catch {
      setObservations([]);
    }
    setLoading(false);
  }, [activeProject?.path, lastFetchedAt, observations.length]);

  useEffect(() => {
    void fetchObservations();
  }, [fetchObservations]);

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
      <PageHeader title={t('page.observations.title')} description={t('page.observations.description')} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('page.observations.searchPlaceholder')}
          className="max-w-xs"
        />
        <span className="text-xs text-muted-foreground">{t('page.observations.count', { count: filtered.length })}</span>
      </div>

      {/* Type filter chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {ALL_TYPES.map((type) => (
          <Chip
            key={type}
            size="sm"
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
        <EmptyState message={search || activeTypes.size > 0 ? t('page.observations.noMatch') : t('page.observations.noObservations')} />
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
