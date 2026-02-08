import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/ui/chip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { ArtifactCard } from '../components/artifact-card';
import { BlockEditor } from '../../../components/editor';
import { useArtifactsStore } from '../stores/artifacts-store';
import { useProjectStore } from '../../../stores/project-store';
import { ROUTES } from '../../../lib/constants';
import { groupByFeature, TYPE_COLORS } from '../lib/parse-artifact';
import { showSuccess, showError } from '../../../lib/toast';
import { ARTIFACT_TYPES } from '../../../lib/types';
import type { ArtifactType, ArtifactStatus } from '../../../lib/types';

const TYPE_OPTIONS = ARTIFACT_TYPES.map((t) => ({
  label: t.charAt(0).toUpperCase() + t.slice(1),
  value: t,
}));

export function ArtifactsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { artifacts, loading, stale, fetch, create, archive, remove } = useArtifactsStore();
  const [search, setSearch] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<ArtifactType>>(new Set());
  const [tab, setTab] = useState<ArtifactStatus | 'all'>('active');

  // Inline create state
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cType, setCType] = useState<string>('plan');
  const [cFeature, setCFeature] = useState('');
  const [cTitle, setCTitle] = useState('');
  const [cDescription, setCDescription] = useState('');
  const [cContent, setCContent] = useState('');

  // Confirm dialog state
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; action: 'archive' | 'delete' } | null>(null);

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetch(activeProject.path);
    }
  }, [activeProject?.path, stale, fetch]);

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
    if (tab !== 'all') {
      result = result.filter((a) => a.status === tab);
    }
    if (activeTypes.size > 0) {
      result = result.filter((a) => activeTypes.has(a.type));
    }
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

  const navigateToDetail = (id: string) => {
    navigate(`${ROUTES.ARTIFACTS}/${id}`);
  };

  const startCreate = () => {
    setCType('plan');
    setCFeature('');
    setCTitle('');
    setCDescription('');
    setCContent('');
    setCreating(true);
  };

  const cancelCreate = () => setCreating(false);

  const handleCreate = useCallback(async () => {
    setSaving(true);
    try {
      await create(cType, cFeature, cTitle, cDescription, cContent);
      showSuccess(t('page.artifacts.createSuccess'));
      setCreating(false);
    } catch {
      showError(t('page.artifacts.createError'));
    } finally {
      setSaving(false);
    }
  }, [cType, cFeature, cTitle, cDescription, cContent, create, t]);

  const handleConfirmAction = async () => {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.action === 'archive') {
        await archive(confirmTarget.id);
        showSuccess(t('page.artifacts.archiveSuccess'));
      } else {
        await remove(confirmTarget.id);
        showSuccess(t('page.artifacts.deleteSuccess'));
      }
    } catch {
      showError(confirmTarget.action === 'archive' ? t('page.artifacts.archiveError') : t('page.artifacts.deleteError'));
    }
  };

  // Escape key cancels
  useEffect(() => {
    if (!creating) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelCreate();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [creating]);

  return (
    <div>
      <PageHeader
        title={t('page.artifacts.title')}
        description={t('page.artifacts.description')}
        actions={
          <Button size="sm" onClick={startCreate} disabled={creating}>
            <Plus size={16} /> {t('page.artifacts.createArtifact')}
          </Button>
        }
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

      {/* Create form — inline card */}
      {creating && (
        <Card className="mb-4 border border-accent bg-accent/5">
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>{t('page.artifacts.typeLabel')}</Label>
                  <Select value={cType} onValueChange={setCType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('page.artifacts.featureLabel')}</Label>
                  <Input value={cFeature} onChange={(e) => setCFeature(e.target.value)} placeholder="Feature slug..." />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('page.artifacts.titleLabel')}</Label>
                  <Input value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="Artifact title..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('page.artifacts.descriptionLabel')}</Label>
                <Input value={cDescription} onChange={(e) => setCDescription(e.target.value)} placeholder="Short description..." />
              </div>
              <div className="space-y-1.5">
                <Label>{t('page.artifacts.contentLabel')}</Label>
                <div className="rounded-lg border border-border overflow-hidden">
                  <BlockEditor initialMarkdown={cContent} editable={true} onChange={setCContent} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" disabled={!cTitle.trim() || !cFeature.trim() || saving} onClick={handleCreate}>
                  <Save size={14} /> {saving ? t('common.saving') : t('common.save')}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelCreate} disabled={saving}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              action={
                !search && activeTypes.size === 0 ? (
                  <Button variant="outline" size="sm" onClick={startCreate}>
                    <Plus size={14} /> {t('page.artifacts.createArtifact')}
                  </Button>
                ) : undefined
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
                        key={artifact.id}
                        artifact={artifact}
                        onClick={() => navigateToDetail(artifact.id)}
                        onArchive={artifact.status === 'active' ? () => setConfirmTarget({ id: artifact.id, action: 'archive' }) : undefined}
                        onDelete={() => setConfirmTarget({ id: artifact.id, action: 'delete' })}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm archive/delete dialog */}
      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => { if (!open) setConfirmTarget(null); }}
        title={confirmTarget?.action === 'archive' ? t('page.artifacts.archiveTitle') : t('page.artifacts.deleteTitle')}
        description={confirmTarget?.action === 'archive' ? t('page.artifacts.archiveDescription') : t('page.artifacts.deleteDescription')}
        confirmLabel={confirmTarget?.action === 'archive' ? t('page.artifacts.archive') : t('common.delete')}
        variant={confirmTarget?.action === 'delete' ? 'destructive' : 'default'}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}
