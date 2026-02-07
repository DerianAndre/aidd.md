import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { BlockEditor, FrontmatterForm, type FieldDefinition } from '../../../components/editor';
import { readFile, writeFile } from '../../../lib/tauri';
import { useProjectStore } from '../../../stores/project-store';
import { useSkillsStore } from '../stores/skills-store';
import { parseFrontmatter, serializeFrontmatter } from '../../../lib/markdown';

export function SkillEditorPage() {
  const { t } = useTranslation();
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const invalidate = useSkillsStore((s) => s.invalidate);

  const skillFields: FieldDefinition[] = useMemo(() => [
    { type: 'text', key: 'name', label: t('page.skills.name'), placeholder: 'skill-name' },
    { type: 'text', key: 'description', label: t('page.skills.skillDescription'), placeholder: 'What this skill does' },
    {
      type: 'select',
      key: 'tier',
      label: t('page.skills.tier'),
      options: [
        { label: t('page.skills.tierHigh'), value: '1' },
        { label: t('page.skills.tierStandard'), value: '2' },
        { label: t('page.skills.tierLow'), value: '3' },
      ],
    },
    { type: 'text', key: 'version', label: t('page.skills.version'), placeholder: '1.0.0' },
    { type: 'text', key: 'license', label: t('page.skills.license'), placeholder: 'MIT' },
  ], [t]);

  const [frontmatterValues, setFrontmatterValues] = useState<Record<string, string>>({});
  const [body, setBody] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filePath, setFilePath] = useState('');

  useEffect(() => {
    if (!activeProject?.path || !name) return;
    void (async () => {
      setLoading(true);
      const path = `${activeProject.path}/content/skills/${decodeURIComponent(name)}/SKILL.md`;
      setFilePath(path);
      try {
        const raw = await readFile(path);
        setOriginalContent(raw);
        const { frontmatter, body: parsedBody } = parseFrontmatter(raw);
        setFrontmatterValues(frontmatter);
        setBody(parsedBody);
      } catch {
        setOriginalContent('');
        setFrontmatterValues({});
        setBody('');
      } finally {
        setLoading(false);
      }
    })();
  }, [activeProject?.path, name]);

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
        title={t('page.skills.editTitle', { name: decodeURIComponent(name ?? '') })}
        description={t('page.skills.editDescription')}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/skills/${name}`)}>
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
          fields={skillFields}
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
