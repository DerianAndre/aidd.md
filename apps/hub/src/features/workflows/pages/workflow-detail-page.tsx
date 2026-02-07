import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { BlockEditor } from '../../../components/editor';
import { readFile, fileExists } from '../../../lib/tauri';
import { contentDir } from '../../../lib/constants';
import { useProjectStore } from '../../../stores/project-store';
import { extractTitle, extractDescription } from '../../../lib/markdown';

export function WorkflowDetailPage() {
  const { t } = useTranslation();
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject?.path || !name) return;
    void (async () => {
      setLoading(true);
      const decodedName = decodeURIComponent(name);
      // All workflows are now at top-level
      const paths = [
        `${contentDir(activeProject.path, 'workflows')}/${decodedName}.md`,
      ];

      for (const path of paths) {
        try {
          const exists = await fileExists(path);
          if (exists) {
            const raw = await readFile(path);
            setContent(raw);
            setTitle(extractTitle(raw) ?? decodedName);
            setDescription(extractDescription(raw) ?? '');
            break;
          }
        } catch {
          // continue to next path
        }
      }
      setLoading(false);
    })();
  }, [activeProject?.path, name]);

  if (loading) {
    return <div className="p-4 text-muted-foreground">Loading...</div>;
  }

  return (
    <div>
      <PageHeader
        title={title || decodeURIComponent(name ?? '')}
        description={description}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/workflows')}>
            <ArrowLeft size={16} /> {t('common.back')}
          </Button>
        }
      />

      {content ? (
        <Card className="gap-0 py-0 overflow-hidden">
          <BlockEditor initialMarkdown={content} editable={false} />
        </Card>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">{t('page.workflows.notFound')}</p>
      )}
    </div>
  );
}
