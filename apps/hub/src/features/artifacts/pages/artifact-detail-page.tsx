import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Pencil, Archive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { PageHeader } from '../../../components/layout/page-header';
import { ConfirmDialog } from '../../../components/confirm-dialog';
import { ArtifactFormDialog } from '../components/artifact-form-dialog';
import { BlockEditor } from '../../../components/editor';
import { useArtifactsStore } from '../stores/artifacts-store';
import { ROUTES } from '../../../lib/constants';
import { TYPE_COLORS } from '../lib/parse-artifact';
import { showSuccess, showError } from '../../../lib/toast';

export function ArtifactDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { artifacts, loading: storeLoading, fetch, update, archive, remove } = useArtifactsStore();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const artifact = artifacts.find((a) => a.id === id) ?? null;
  const loading = storeLoading && artifacts.length === 0;

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

  const handleEdit = async (type: string, feature: string, title: string, description: string, content: string, status?: string) => {
    try {
      await update(artifact.id, type, feature, title, description, content, status ?? artifact.status);
      showSuccess(t('page.artifacts.updateSuccess'));
    } catch {
      showError(t('page.artifacts.updateError'));
    }
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
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

  return (
    <div>
      <PageHeader
        title={artifact.title}
        description={artifact.description}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
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
            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.ARTIFACTS)}>
              <ArrowLeft size={16} /> {t('common.back')}
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
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

      {artifact.content ? (
        <Card className="gap-0 py-0 overflow-hidden">
          <BlockEditor initialMarkdown={artifact.content} editable={false} />
        </Card>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t('page.artifacts.noContent')}
        </p>
      )}

      {/* Edit dialog */}
      <ArtifactFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={artifact}
        onSubmit={handleEdit}
      />

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
