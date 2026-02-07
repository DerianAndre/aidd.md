import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { BlockEditor } from '../../../components/editor';
import { readFile, writeFile } from '../../../lib/tauri';
import { useProjectStore } from '../../../stores/project-store';
import { useTemplatesStore } from '../stores/templates-store';

export function TemplateEditorPage() {
  const { t } = useTranslation();
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const invalidate = useTemplatesStore((s) => s.invalidate);

  const [content, setContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filePath, setFilePath] = useState('');

  useEffect(() => {
    if (!activeProject?.path || !name) return;
    void (async () => {
      setLoading(true);
      const path = `${activeProject.path}/content/templates/${decodeURIComponent(name)}.md`;
      setFilePath(path);
      try {
        const raw = await readFile(path);
        setContent(raw);
        setEditedContent(raw);
      } catch {
        setContent('');
        setEditedContent('');
      } finally {
        setLoading(false);
      }
    })();
  }, [activeProject?.path, name]);

  const handleSave = useCallback(async () => {
    if (!filePath || !editedContent) return;
    setSaving(true);
    try {
      await writeFile(filePath, editedContent);
      setContent(editedContent);
      invalidate();
    } finally {
      setSaving(false);
    }
  }, [filePath, editedContent, invalidate]);

  const hasChanges = content !== editedContent;

  if (loading) {
    return <div className="p-4 text-muted-foreground">Loading...</div>;
  }

  return (
    <div>
      <PageHeader
        title={decodeURIComponent(name ?? '')}
        description={t('page.templates.editDescription')}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/templates')}>
              <ArrowLeft size={16} /> {t('common.back')}
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!hasChanges || saving}
              onClick={() => void handleSave()}
            >
              <Save size={16} /> {saving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        }
      />

      <Card className="gap-0 py-0 overflow-hidden">
        <BlockEditor
          initialMarkdown={content}
          editable={true}
          onChange={setEditedContent}
        />
      </Card>
    </div>
  );
}
