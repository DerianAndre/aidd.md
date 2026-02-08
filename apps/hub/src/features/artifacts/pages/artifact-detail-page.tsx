import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { BlockEditor } from '../../../components/editor';
import { readFile } from '../../../lib/tauri';
import { ROUTES } from '../../../lib/constants';
import { useProjectStore } from '../../../stores/project-store';
import { extractTitle, extractDescription } from '../../../lib/markdown';
import { normalizePath } from '../../../lib/utils';
import { parseArtifactFilename, TYPE_COLORS } from '../lib/parse-artifact';

export function ArtifactDetailPage() {
  const { t } = useTranslation();
  const { '*': wildcard } = useParams();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parsed, setParsed] = useState<ReturnType<typeof parseArtifactFilename>>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject?.path || !wildcard) return;
    void (async () => {
      setLoading(true);
      try {
        const decodedPath = decodeURIComponent(wildcard);
        const fullPath = `${normalizePath(activeProject.path)}/${decodedPath}`;
        const raw = await readFile(fullPath);
        setContent(raw);
        setTitle(extractTitle(raw) ?? decodedPath.split('/').pop()?.replace('.md', '') ?? '');
        setDescription(extractDescription(raw) ?? '');

        const filename = decodedPath.split('/').pop() ?? '';
        setParsed(parseArtifactFilename(filename));
      } catch {
        setContent('');
      }
      setLoading(false);
    })();
  }, [activeProject?.path, wildcard]);

  if (loading) {
    return <div className="p-4 text-muted-foreground">{t('common.loading')}</div>;
  }

  const typeColor = parsed
    ? (TYPE_COLORS[parsed.type] as 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info')
    : 'default';

  return (
    <div>
      <PageHeader
        title={title || decodeURIComponent(wildcard ?? '')}
        description={description}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.ARTIFACTS)}>
            <ArrowLeft size={16} /> {t('common.back')}
          </Button>
        }
      />

      {parsed && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Chip size="sm" color={typeColor}>
            {parsed.type}
          </Chip>
          <Chip size="sm" color="default">
            {parsed.feature}
          </Chip>
          <span className="text-xs text-muted-foreground">{parsed.date}</span>
        </div>
      )}

      {content ? (
        <Card className="gap-0 py-0 overflow-hidden">
          <BlockEditor initialMarkdown={content} editable={false} />
        </Card>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t('page.artifacts.notFound')}
        </p>
      )}
    </div>
  );
}
