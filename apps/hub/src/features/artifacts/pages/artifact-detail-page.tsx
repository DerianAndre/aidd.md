import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { BlockEditor } from '../../../components/editor';
import { listArtifacts } from '../../../lib/tauri';
import { ROUTES } from '../../../lib/constants';
import { TYPE_COLORS } from '../lib/parse-artifact';
import type { ArtifactEntry } from '../../../lib/types';

export function ArtifactDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [artifact, setArtifact] = useState<ArtifactEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      try {
        // Fetch all artifacts and find by ID (no dedicated get-by-id Tauri command)
        const rows = await listArtifacts();
        const found = (rows as ArtifactEntry[]).find((a) => a.id === id) ?? null;
        setArtifact(found);
      } catch {
        setArtifact(null);
      }
      setLoading(false);
    })();
  }, [id]);

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
        title={artifact.title}
        description={artifact.description}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.ARTIFACTS)}>
            <ArrowLeft size={16} /> {t('common.back')}
          </Button>
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
          {t('page.artifacts.notFound')}
        </p>
      )}
    </div>
  );
}
