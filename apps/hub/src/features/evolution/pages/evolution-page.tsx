import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Save } from 'lucide-react';
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
import { CandidateCard } from '../components/candidate-card';
import { useEvolutionStore } from '../stores/evolution-store';
import { useProjectStore } from '../../../stores/project-store';
import { showSuccess, showError } from '../../../lib/toast';
import { formatDate } from '../../../lib/utils';
import type { EvolutionAction, EvolutionCandidate, EvolutionType } from '../../../lib/types';

const EVOLUTION_TYPES: EvolutionType[] = [
  'routing_weight', 'skill_combo', 'rule_elevation', 'compound_workflow',
  'tkb_promotion', 'new_convention', 'model_recommendation',
];

const TYPE_OPTIONS = EVOLUTION_TYPES.map((t) => ({
  label: t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  value: t,
}));

const ACTION_COLORS: Record<EvolutionAction, 'success' | 'accent' | 'warning' | 'danger' | 'default'> = {
  auto_applied: 'success',
  drafted: 'accent',
  pending: 'warning',
  reverted: 'danger',
  rejected: 'danger',
};

const ACTION_KEYS = {
  auto_applied: 'page.evolution.autoApplied' as const,
  drafted: 'page.evolution.drafted' as const,
  pending: 'page.evolution.pending' as const,
  reverted: 'page.evolution.reverted' as const,
  rejected: 'page.evolution.rejected' as const,
} satisfies Record<EvolutionAction, string>;

export function EvolutionPage() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((s) => s.activeProject);
  const { candidates, logEntries, loading, stale, fetch, approveCandidate, rejectCandidate, createCandidate, updateCandidate, removeCandidate } = useEvolutionStore();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Inline create/edit state
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Draft fields
  const [dType, setDType] = useState<EvolutionType>('routing_weight');
  const [dTitle, setDTitle] = useState('');
  const [dConfidence, setDConfidence] = useState('50');
  const [dDescription, setDDescription] = useState('');
  const [dSuggestedAction, setDSuggestedAction] = useState('');
  const [dModelScope, setDModelScope] = useState('');

  useEffect(() => {
    if (activeProject?.path && stale) {
      void fetch(activeProject.path);
    }
  }, [activeProject?.path, stale, fetch]);

  const startCreate = () => {
    setDType('routing_weight');
    setDTitle('');
    setDConfidence('50');
    setDDescription('');
    setDSuggestedAction('');
    setDModelScope('');
    setCreating(true);
    setEditingId(null);
  };

  const startEdit = (c: EvolutionCandidate) => {
    setDType(c.type);
    setDTitle(c.title);
    setDConfidence(String(c.confidence));
    setDDescription(c.description);
    setDSuggestedAction(c.suggestedAction);
    setDModelScope(c.modelScope ?? '');
    setEditingId(c.id);
    setCreating(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCreating(false);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const confidence = Number(dConfidence) || 50;
      const modelScope = dModelScope.trim() || undefined;

      if (creating) {
        await createCandidate(dType, dTitle, confidence, {
          description: dDescription,
          suggestedAction: dSuggestedAction,
          modelScope,
        });
        showSuccess(t('page.evolution.createSuccess'));
        setCreating(false);
      } else if (editingId) {
        await updateCandidate(editingId, dType, dTitle, confidence, {
          description: dDescription,
          suggestedAction: dSuggestedAction,
          modelScope,
        });
        showSuccess(t('page.evolution.updateSuccess'));
        setEditingId(null);
      }
    } catch {
      showError(creating ? t('page.evolution.createError') : t('page.evolution.updateError'));
    } finally {
      setSaving(false);
    }
  }, [creating, editingId, dType, dTitle, dConfidence, dDescription, dSuggestedAction, dModelScope, createCandidate, updateCandidate, t]);

  const handleApprove = async (id: string) => {
    try {
      await approveCandidate(id);
      showSuccess(t('page.evolution.approveSuccess'));
    } catch {
      showError(t('page.evolution.approveError'));
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await rejectCandidate(id, reason);
      showSuccess(t('page.evolution.rejectSuccess'));
    } catch {
      showError(t('page.evolution.rejectError'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await removeCandidate(deleteId);
      showSuccess(t('page.evolution.deleteSuccess'));
    } catch {
      showError(t('page.evolution.deleteError'));
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

  const renderEditForm = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>{t('page.evolution.typeLabel')}</Label>
          <Select value={dType} onValueChange={(v) => setDType(v as EvolutionType)}>
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
          <Label>{t('page.evolution.titleLabel')}</Label>
          <Input value={dTitle} onChange={(e) => setDTitle(e.target.value)} placeholder="Candidate title..." />
        </div>
        <div className="space-y-1.5">
          <Label>{t('page.evolution.confidenceLabel')}</Label>
          <Input type="number" value={dConfidence} onChange={(e) => setDConfidence(e.target.value)} placeholder="50" min={0} max={100} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>{t('page.evolution.descriptionLabel')}</Label>
        <Textarea value={dDescription} onChange={(e) => setDDescription(e.target.value)} placeholder="Description..." />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t('page.evolution.suggestedActionLabel')}</Label>
          <Input value={dSuggestedAction} onChange={(e) => setDSuggestedAction(e.target.value)} placeholder="Suggested action..." />
        </div>
        <div className="space-y-1.5">
          <Label>{t('page.evolution.modelScopeLabel')}</Label>
          <Input value={dModelScope} onChange={(e) => setDModelScope(e.target.value)} placeholder="Optional model scope..." />
        </div>
      </div>
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

  if (loading) {
    return (
      <div>
        <PageHeader title={t('page.evolution.title')} description={t('page.evolution.description')} />
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

  return (
    <div>
      <PageHeader title={t('page.evolution.title')} description={t('page.evolution.description')} />

      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={startCreate} disabled={creating}>
          <Plus size={14} /> {t('page.evolution.addCandidate')}
        </Button>
      </div>

      {/* Create form — inline card at top */}
      {creating && (
        <Card className="mb-4 border border-accent bg-accent/5">
          <CardContent>
            {renderEditForm()}
          </CardContent>
        </Card>
      )}

      {/* Edit form — inline card above candidates */}
      {editingId && (
        <Card className="mb-4 border border-accent bg-accent/5">
          <CardContent>
            {renderEditForm()}
          </CardContent>
        </Card>
      )}

      {!hasCandidates && !hasLog && !creating && (
        <EmptyState
          message={t('page.evolution.noEvolution')}
          action={
            <Button size="sm" variant="outline" onClick={startCreate}>
              <Plus size={14} /> {t('page.evolution.createFirst')}
            </Button>
          }
        />
      )}

      {/* Pending candidates */}
      {hasCandidates && (
        <section className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {t('page.evolution.pendingCandidates', { count: candidates.length })}
          </h3>
          <div className="space-y-2">
            {candidates.map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                onApprove={handleApprove}
                onReject={handleReject}
                onEdit={(cand) => startEdit(cand)}
                onDelete={(id) => setDeleteId(id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Evolution log */}
      {hasLog && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {t('page.evolution.evolutionLog', { count: logEntries.length })}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">{t('page.evolution.action')}</th>
                  <th className="px-3 py-2 font-medium">{t('page.evolution.entryTitle')}</th>
                  <th className="px-3 py-2 font-medium">{t('page.evolution.confidence')}</th>
                  <th className="px-3 py-2 font-medium">{t('page.evolution.date')}</th>
                </tr>
              </thead>
              <tbody>
                {logEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-muted last:border-0">
                    <td className="px-3 py-2">
                      <Chip size="sm" color={ACTION_COLORS[entry.action]}>
                        {t(ACTION_KEYS[entry.action])}
                      </Chip>
                    </td>
                    <td className="px-3 py-2 text-foreground">{entry.title}</td>
                    <td className="px-3 py-2 text-muted-foreground">{entry.confidence}%</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDate(entry.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('page.evolution.deleteTitle')}
        description={t('page.evolution.deleteDescription')}
        variant="destructive"
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
      />
    </div>
  );
}
