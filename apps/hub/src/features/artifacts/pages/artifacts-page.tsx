import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/ui/chip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { ArtifactCard } from '../components/artifact-card';
import { useProjectStore } from '../../../stores/project-store';
import { listMarkdownEntities } from '../../../lib/tauri';
import { ARTIFACT_DIRS, ROUTES } from '../../../lib/constants';
import { normalizePath } from '../../../lib/utils';
import { toArtifactEntry, groupByFeature, TYPE_COLORS } from '../lib/parse-artifact';
import { ARTIFACT_TYPES } from '../../../lib/types';
import type { ArtifactEntry, ArtifactType, ArtifactStatus } from '../../../lib/types';

const STALE_TTL = 30_000;

export function ArtifactsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const [artifacts, setArtifacts] = useState<ArtifactEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<ArtifactType>>(new Set());
  const [tab, setTab] = useState<ArtifactStatus | 'all'>('active');
  const [lastFetchedAt, setLastFetchedAt] = useState(0);

  const fetchArtifacts = useCallback(async () => {
    if (!activeProject?.path) return;
    const isExpired = Date.now() - lastFetchedAt > STALE_TTL;
    if (!isExpired && artifacts.length > 0) return;

    setLoading(true);
    try {
      const root = normalizePath(activeProject.path);
      const [activeEntities, doneEntities] = await Promise.all([
        listMarkdownEntities(`${root}/${ARTIFACT_DIRS.ACTIVE}`).catch(() => []),
        listMarkdownEntities(`${root}/${ARTIFACT_DIRS.DONE}`).catch(() => []),
      ]);

      const all = [...activeEntities, ...doneEntities]
        .map(toArtifactEntry)
        .filter((e): e is ArtifactEntry => e !== null)
        .sort((a, b) => b.date.localeCompare(a.date));

      setArtifacts(all);
      setLastFetchedAt(Date.now());
    } catch {
      setArtifacts([]);
    }
    setLoading(false);
  }, [activeProject?.path, lastFetchedAt, artifacts.length]);

  useEffect(() => {
    void fetchArtifacts();
  }, [fetchArtifacts]);

  const toggleType = (type: ArtifactType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = artifacts;

    // Tab filter
    if (tab !== 'all') {
      result = result.filter((a) => a.status === tab);
    }

    // Type filter
    if (activeTypes.size > 0) {
      result = result.filter((a) => activeTypes.has(a.type));
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.feature.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q),
      );
    }

    return result;
  }, [artifacts, tab, activeTypes, search]);

  const activeCount = useMemo(
    () => artifacts.filter((a) => a.status === 'active').length,
    [artifacts],
  );
  const doneCount = useMemo(
    () => artifacts.filter((a) => a.status === 'done').length,
    [artifacts],
  );

  const grouped = useMemo(() => groupByFeature(filtered), [filtered]);

  const navigateToDetail = (artifact: ArtifactEntry) => {
    // Build relative path from project root
    const root = normalizePath(activeProject?.path ?? '');
    const rel = normalizePath(artifact.path).replace(root + '/', '');
    navigate(`${ROUTES.ARTIFACTS}/${encodeURIComponent(rel)}`);
  };

  return (
    <div>
      <PageHeader
        title={t('page.artifacts.title')}
        description={t('page.artifacts.description')}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('page.artifacts.searchPlaceholder')}
          className="max-w-xs"
        />
        <span className="text-xs text-muted-foreground">
          {t('page.artifacts.count', { count: filtered.length })}
        </span>
      </div>

      {/* Type filter chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {ARTIFACT_TYPES.map((type) => (
          <Chip
            key={type}
            size="sm"
            color={
              activeTypes.has(type)
                ? (TYPE_COLORS[type] as 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'default')
                : 'default'
            }
            className="cursor-pointer"
            onClick={() => toggleType(type)}
          >
            {type}
          </Chip>
        ))}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ArtifactStatus | 'all')}>
        <TabsList>
          <TabsTrigger value="active">
            {t('page.artifacts.active', { count: activeCount })}
          </TabsTrigger>
          <TabsTrigger value="done">
            {t('page.artifacts.done', { count: doneCount })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {loading && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <EmptyState
              message={
                search || activeTypes.size > 0
                  ? t('page.artifacts.noMatch')
                  : t('page.artifacts.noArtifacts')
              }
            />
          )}

          {!loading && filtered.length > 0 && (
            <div className="mt-4 space-y-6">
              {[...grouped.entries()].map(([feature, items]) => (
                <div key={feature}>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    {feature}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((artifact) => (
                      <ArtifactCard
                        key={artifact.path}
                        artifact={artifact}
                        onClick={() => navigateToDetail(artifact)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
