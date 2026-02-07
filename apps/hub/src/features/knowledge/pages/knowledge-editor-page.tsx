import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { BlockEditor, FrontmatterForm, type FieldDefinition } from '../../../components/editor';
import { readFile, writeFile } from '../../../lib/tauri';
import { contentDir } from '../../../lib/constants';
import { useProjectStore } from '../../../stores/project-store';
import { useKnowledgeStore } from '../stores/knowledge-store';
import { parseFrontmatter, serializeFrontmatter } from '../../../lib/markdown';

export function KnowledgeEditorPage() {
  const { t } = useTranslation();
  const { '*': pathParam } = useParams();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const invalidate = useKnowledgeStore((s) => s.invalidate);

  const knowledgeFields: FieldDefinition[] = useMemo(() => [
    { type: 'text', key: 'name', label: t('page.knowledge.name'), required: true },
    { type: 'text', key: 'category', label: t('page.knowledge.category') },
    {
      type: 'select',
      key: 'maturity',
      label: t('page.knowledge.maturity'),
      options: [
        { label: t('page.knowledge.maturityEmerging'), value: 'emerging' },
        { label: t('page.knowledge.maturityGrowing'), value: 'growing' },
        { label: t('page.knowledge.maturityStable'), value: 'stable' },
        { label: t('page.knowledge.maturityDeclining'), value: 'declining' },
      ],
    },
    { type: 'text', key: 'last_updated', label: t('page.knowledge.lastUpdated'), placeholder: t('page.knowledge.lastUpdatedPlaceholder') },
  ], [t]);

  const [frontmatterValues, setFrontmatterValues] = useState<Record<string, string>>({});
  const [body, setBody] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filePath, setFilePath] = useState('');

  useEffect(() => {
    if (!activeProject?.path || !pathParam) return;
    void (async () => {
      setLoading(true);
      const path = `${contentDir(activeProject.path, 'knowledge')}/${pathParam}.md`;
      setFilePath(path);
      try {
        const raw = await readFile(path);
        setOriginalContent(raw);
        const { frontmatter, body: parsedBody } = parseFrontmatter(raw);
        setFrontmatterValues(frontmatter);
        setBody(parsedBody);
      } catch {
        setOriginalContent('');
      } finally {
        setLoading(false);
      }
    })();
  }, [activeProject?.path, pathParam]);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFrontmatterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const buildContent = useCallback(() => {
    return serializeFrontmatter(frontmatterValues, body);
  }, [frontmatterValues, body]);

  const handleSave = useCallback(async () => {
    if (!filePath) return;
    setSaving(true);
    try {
      const content = buildContent();
      await writeFile(filePath, content);
      setOriginalContent(content);
      invalidate();
    } finally {
      setSaving(false);
    }
  }, [filePath, buildContent, invalidate]);

  const hasChanges = buildContent() !== originalContent;

  if (loading) {
    return <div className="p-4 text-muted-foreground">Loading...</div>;
  }

  return (
    <div>
      <PageHeader
        title={t('page.knowledge.editTitle', { path: pathParam ?? '' })}
        description={t('page.knowledge.editDescription')}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/knowledge')}>
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

      <div className="mb-4">
        <FrontmatterForm
          fields={knowledgeFields}
          values={frontmatterValues}
          onChange={handleFieldChange}
        />
      </div>

      <Card className="gap-0 py-0 overflow-hidden">
        <BlockEditor
          initialMarkdown={body}
          editable={true}
          onChange={setBody}
        />
      </Card>
    </div>
  );
}
