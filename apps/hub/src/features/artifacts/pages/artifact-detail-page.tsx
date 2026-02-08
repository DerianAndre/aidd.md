import { useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Archive, Pencil, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { PageHeader } from '../../../components/layout/page-header';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { BlockEditor } from '../../../components/editor';
import { FrontmatterForm } from '../../../components/editor/frontmatter-form';
import { useEditableEntity } from '../../../hooks/use-editable-entity';
import { useArtifactsStore } from '../stores/artifacts-store';
import { ROUTES } from '../../../lib/constants';
import { TYPE_COLORS } from '../lib/parse-artifact';
import { ARTIFACT_TYPES } from '../../../lib/types';
import { showSuccess, showError } from '../../../lib/toast';
import type { ArtifactEntry } from '../../../lib/types';
import type { FieldDefinition } from '../../../components/editor/frontmatter-form';

// ---------------------------------------------------------------------------
// Select options
// ---------------------------------------------------------------------------

const TYPE_OPTIONS = ARTIFACT_TYPES.map((t) => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }));

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Done', value: 'done' },
];

// ---------------------------------------------------------------------------
// Draft shape for useEditableEntity
// ---------------------------------------------------------------------------

interface ArtifactDraft {
  [key: string]: string;
  type: string;
  feature: string;
  title: string;
  description: string;
  status: string;
  content: string;
}

function artifactToDraft(a: ArtifactEntry): ArtifactDraft {
  return {
    type: a.type,
    feature: a.feature,
    title: a.title,
    description: a.description,
    status: a.status,
    content: a.content ?? '',
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArtifactDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { artifacts, loading: storeLoading, fetch, update, archive, remove } = useArtifactsStore();

  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const artifact = artifacts.find((a) => a.id === id) ?? null;
  const loading = storeLoading && artifacts.length === 0;

  // Editable entity — initial data from found artifact
  const initial = useMemo<ArtifactDraft>(
    () => artifact ? artifactToDraft(artifact) : { type: 'plan', feature: '', title: '', description: '', status: 'active', content: '' },
    [artifact],
  );

  const handleSaveEntity = useCallback(async (updated: ArtifactDraft) => {
    if (!artifact) return;
    await update(artifact.id, updated.type, updated.feature, updated.title, updated.description, updated.content, updated.status);
    showSuccess(t('page.artifacts.updateSuccess'));
  }, [artifact, update, t]);

  const { draft, setField, editing, setEditing, save, cancel, saving, dirty } = useEditableEntity<ArtifactDraft>({
    initial,
    onSave: handleSaveEntity,
  });

  // Escape key cancels
  useEffect(() => {
    if (!editing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editing, cancel]);

  // Field definitions
  const metadataFields: FieldDefinition[] = useMemo(() => [
    { type: 'select' as const, key: 'type', label: t('page.artifacts.typeLabel'), options: TYPE_OPTIONS },
    { type: 'text' as const, key: 'feature', label: t('page.artifacts.featureLabel'), placeholder: t('page.artifacts.featurePlaceholder') },
    { type: 'text' as const, key: 'title', label: t('page.artifacts.titleLabel'), placeholder: t('page.artifacts.titlePlaceholder') },
    { type: 'text' as const, key: 'description', label: t('page.artifacts.descriptionLabel'), placeholder: t('page.artifacts.descriptionPlaceholder') },
    { type: 'select' as const, key: 'status', label: t('page.artifacts.statusLabel'), options: STATUS_OPTIONS },
  ], [t]);

  // FrontmatterForm expects Record<string, string>
  const formValues = useMemo<Record<string, string>>(() => ({
    type: draft.type,
    feature: draft.feature,
    title: draft.title,
    description: draft.description,
    status: draft.status,
  }), [draft]);

  const handleFormChange = useCallback((key: string, value: string) => {
    setField(key as keyof ArtifactDraft, value);
  }, [setField]);

  const handleConfirm = async () => {
    if (!confirmAction || !artifact) return;
    try {
      if (confirmAction === 'archive') {
        await archive(artifact.id);
        showSuccess(t('page.artifacts.archiveSuccess'));
      } else {
        await remove(artifact.id);
        showSuccess(t('page.artifacts.deleteSuccess'));
        navigate(ROUTES.ARTIFACTS);
      }
    } catch {
      showError(confirmAction === 'archive' ? t('page.artifacts.archiveError') : t('page.artifacts.deleteError'));
    }
  };

  const handleSave = async () => {
    try {
      await save();
    } catch {
      showError(t('page.artifacts.updateError'));
    }
  };

  if (loading) {
    return <div className="p-4 text-muted-foreground">{t('common.loading')}</div>;
  }

  if (!artifact) {
    return (
      <div>
        <PageHeader
          title={t('page.artifacts.notFound')}
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.ARTIFACTS)}>
              <ArrowLeft size={16} /> {t('common.back')}
            </Button>
          }
        />
      </div>
    );
  }

  const typeColor = TYPE_COLORS[artifact.type] as
    | 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

  return (
    <div>
      <PageHeader
        title={editing ? t('page.artifacts.editArtifact') : artifact.title}
        description={editing ? undefined : artifact.description}
        actions={
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button size="sm" disabled={!dirty || saving} onClick={handleSave}>
                  <Save size={14} /> {saving ? t('common.saving') : t('common.save')}
                </Button>
                <Button size="sm" variant="outline" onClick={cancel} disabled={saving}>
                  {t('common.cancel')}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  <Pencil size={14} /> {t('common.edit')}
                </Button>
                {artifact.status === 'active' && (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmAction('archive')}>
                    <Archive size={14} /> {t('page.artifacts.archive')}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmAction('delete')}>
                  <Trash2 size={14} /> {t('common.delete')}
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.ARTIFACTS)}>
              <ArrowLeft size={16} /> {t('common.back')}
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Metadata — chips in view mode, form in edit mode */}
        {editing ? (
          <FrontmatterForm
            disabled={false}
            fields={metadataFields}
            values={formValues}
            onChange={handleFormChange}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Chip size="sm" color={typeColor}>
              {artifact.type}
            </Chip>
            <Chip size="sm" color="default">
              {artifact.feature}
            </Chip>
            <Chip size="sm" color={artifact.status === 'active' ? 'success' : 'default'}>
              {artifact.status}
            </Chip>
            <span className="text-xs text-muted-foreground">{artifact.date}</span>
          </div>
        )}

        {/* Content — BlockEditor with editable toggle */}
        {draft.content || editing ? (
          <Card className="gap-0 py-0 overflow-hidden">
            <CardContent className="p-0">
              {editing && (
                <p className="px-4 pt-3 text-[10px] font-medium uppercase text-muted-foreground">
                  {t('page.artifacts.contentLabel')}
                </p>
              )}
              <BlockEditor
                initialMarkdown={draft.content}
                editable={editing}
                onChange={editing ? (md) => setField('content', md) : undefined}
              />
            </CardContent>
          </Card>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('page.artifacts.noContent')}
          </p>
        )}
      </div>

      {/* Confirm archive/delete */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={confirmAction === 'archive' ? t('page.artifacts.archiveTitle') : t('page.artifacts.deleteTitle')}
        description={confirmAction === 'archive' ? t('page.artifacts.archiveDescription') : t('page.artifacts.deleteDescription')}
        confirmLabel={confirmAction === 'archive' ? t('page.artifacts.archive') : t('common.delete')}
        variant={confirmAction === 'delete' ? 'destructive' : 'default'}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
