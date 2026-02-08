import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Save } from 'lucide-react';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '../../../components/layout/page-header';
import { EmptyState } from '../../../components/empty-state';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { ObservationCard } from '../components/observation-card';
import { EditableList } from '../../../components/editable-list';
import { useObservationsStore } from '../stores/observations-store';
import { useProjectStore } from '../../../stores/project-store';
import { showSuccess, showError } from '../../../lib/toast';
import type { SessionObservation, ObservationType } from '../../../lib/types';

const ALL_TYPES: ObservationType[] = [
  'decision', 'mistake', 'convention', 'pattern',
  'preference', 'insight', 'tool_outcome', 'workflow_outcome',
];

const TYPE_OPTIONS = ALL_TYPES.map((t) => ({
  label: t.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  value: t,
}));

export function ObservationsPage() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { observations, loading, stale, fetch, addObservation, editObservation, removeObservation } = useObservationsStore();
  const [search, setSearch] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<ObservationType>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Inline create/edit state
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Draft fields
  const [dType, setDType] = useState<ObservationType>('insight');
  const [dTitle, setDTitle] = useState('');
  const [dNarrative, setDNarrative] = useState('');
  const [dFacts, setDFacts] = useState<string[]>([]);
  const [dConcepts, setDConcepts] = useState<string[]>([]);
  const [dFilesRead, setDFilesRead] = useState<string[]>([]);
  const [dFilesModified, setDFilesModified] = useState<string[]>([]);
  const [dDiscoveryTokens, setDDiscoveryTokens] = useState('');

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetch();
    }
  }, [activeProject?.path, stale, fetch]);

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

  const startCreate = () => {
    setDType('insight');
    setDTitle('');
    setDNarrative('');
    setDFacts([]);
    setDConcepts([]);
    setDFilesRead([]);
    setDFilesModified([]);
    setDDiscoveryTokens('');
    setCreating(true);
    setEditingId(null);
  };

  const startEdit = (obs: SessionObservation) => {
    setDType(obs.type);
    setDTitle(obs.title);
    setDNarrative(obs.narrative ?? '');
    setDFacts([...(obs.facts ?? [])]);
    setDConcepts([...(obs.concepts ?? [])]);
    setDFilesRead([...(obs.filesRead ?? [])]);
    setDFilesModified([...(obs.filesModified ?? [])]);
    setDDiscoveryTokens(obs.discoveryTokens ? String(obs.discoveryTokens) : '');
    setEditingId(obs.id);
    setCreating(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCreating(false);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const narrative = dNarrative || undefined;
      const facts = dFacts.length > 0 ? JSON.stringify(dFacts) : undefined;
      const concepts = dConcepts.length > 0 ? JSON.stringify(dConcepts) : undefined;
      const filesRead = dFilesRead.length > 0 ? JSON.stringify(dFilesRead) : undefined;
      const filesModified = dFilesModified.length > 0 ? JSON.stringify(dFilesModified) : undefined;
      const tokens = dDiscoveryTokens ? Number(dDiscoveryTokens) : undefined;

      if (creating) {
        await addObservation('manual', dType, dTitle, narrative);
        showSuccess(t('page.observations.created'));
        setCreating(false);
      } else if (editingId) {
        await editObservation(editingId, dType, dTitle, narrative, facts, concepts, filesRead, filesModified, tokens);
        showSuccess(t('page.observations.updated'));
        setEditingId(null);
      }
    } catch {
      showError(creating ? t('page.observations.createError') : t('page.observations.updateError'));
    } finally {
      setSaving(false);
    }
  }, [creating, editingId, dType, dTitle, dNarrative, dFacts, dConcepts, dFilesRead, dFilesModified, dDiscoveryTokens, addObservation, editObservation, t]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await removeObservation(deleteId);
      showSuccess(t('page.observations.deleted'));
    } catch {
      showError(t('page.observations.deleteError'));
    }
  };

  // Escape key cancels
  useEffect(() => {
    if (!editingId && !creating) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelEdit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingId, creating]);

  const renderEditForm = (isCreate: boolean) => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t('page.observations.typeLabel')}</Label>
          <Select value={dType} onValueChange={(v) => setDType(v as ObservationType)}>
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
          <Label>{t('page.observations.titleLabel')}</Label>
          <Input value={dTitle} onChange={(e) => setDTitle(e.target.value)} placeholder="Short title..." />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>{t('page.observations.narrativeLabel')}</Label>
        <Textarea value={dNarrative} onChange={(e) => setDNarrative(e.target.value)} placeholder="Detailed narrative..." />
      </div>
      {!isCreate && (
        <>
          <EditableList label="Facts" items={dFacts} onChange={setDFacts} editing={true} placeholder="Add fact..." />
          <EditableList label="Concepts" items={dConcepts} onChange={setDConcepts} editing={true} placeholder="Add concept..." />
          <EditableList label="Files Read" items={dFilesRead} onChange={setDFilesRead} editing={true} placeholder="Add file path..." />
          <EditableList label="Files Modified" items={dFilesModified} onChange={setDFilesModified} editing={true} placeholder="Add file path..." />
          <div className="space-y-1.5">
            <Label>Discovery Tokens</Label>
            <Input type="number" value={dDiscoveryTokens} onChange={(e) => setDDiscoveryTokens(e.target.value)} placeholder="0" min={0} />
          </div>
        </>
      )}
      <div className="flex justify-end gap-2">
        <Button size="sm" disabled={!dTitle.trim() || saving} onClick={handleSave}>
          <Save size={14} /> {saving ? t('common.saving') : t('common.save')}
        </Button>
        <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );

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
        <div className="ml-auto">
          <Button size="sm" onClick={startCreate} disabled={creating}>
            <Plus size={14} /> {t('page.observations.addObservation')}
          </Button>
        </div>
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

      {/* Create form — inline card at top */}
      {creating && (
        <Card className="mb-4 border border-accent bg-accent/5">
          <CardContent>
            {renderEditForm(true)}
          </CardContent>
        </Card>
      )}

      {/* Edit form — inline card above the card being edited */}
      {editingId && (
        <Card className="mb-4 border border-accent bg-accent/5">
          <CardContent>
            {renderEditForm(false)}
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && !creating && (
        <EmptyState
          message={search || activeTypes.size > 0 ? t('page.observations.noMatch') : t('page.observations.noObservations')}
          action={!search && activeTypes.size === 0 ? (
            <Button size="sm" variant="outline" onClick={startCreate}>
              <Plus size={14} /> {t('page.observations.createFirst')}
            </Button>
          ) : undefined}
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((obs) => (
            <ObservationCard
              key={obs.id}
              observation={obs}
              onEdit={(o) => startEdit(o)}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('page.observations.deleteTitle')}
        description={t('page.observations.deleteDescription')}
        variant="destructive"
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
      />
    </div>
  );
}
