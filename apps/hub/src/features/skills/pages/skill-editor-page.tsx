import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@heroui/react';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { BlockEditor, FrontmatterForm, type FieldDefinition } from '../../../components/editor';
import { readFile, writeFile } from '../../../lib/tauri';
import { useProjectStore } from '../../../stores/project-store';
import { useSkillsStore } from '../stores/skills-store';
import { parseFrontmatter, serializeFrontmatter } from '../../../lib/markdown';

const SKILL_FIELDS: FieldDefinition[] = [
  { type: 'text', key: 'name', label: 'Name', placeholder: 'skill-name' },
  { type: 'text', key: 'description', label: 'Description', placeholder: 'What this skill does' },
  {
    type: 'select',
    key: 'model',
    label: 'Model',
    options: [
      { label: 'Opus 4.6', value: 'claude-opus-4-6' },
      { label: 'Sonnet 4.5', value: 'claude-sonnet-4-5-20250929' },
      { label: 'Haiku 4.5', value: 'claude-haiku-4-5-20251001' },
    ],
  },
  { type: 'text', key: 'version', label: 'Version', placeholder: '1.0.0' },
  { type: 'text', key: 'license', label: 'License', placeholder: 'MIT' },
];

export function SkillEditorPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const invalidate = useSkillsStore((s) => s.invalidate);

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
      const path = `${activeProject.path}/skills/${decodeURIComponent(name)}/SKILL.md`;
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
    return <div className="p-4 text-default-400">Loading...</div>;
  }

  return (
    <div>
      <PageHeader
        title={`Edit: ${decodeURIComponent(name ?? '')}`}
        description="Edit skill definition"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onPress={() => navigate(`/skills/${name}`)}>
              <ArrowLeft size={16} /> Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              isDisabled={!hasChanges || saving}
              onPress={() => void handleSave()}
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <FrontmatterForm
          fields={SKILL_FIELDS}
          values={frontmatterValues}
          onChange={handleFieldChange}
        />
      </div>

      <div className="rounded-xl border border-default-200">
        <BlockEditor
          initialMarkdown={body}
          editable={true}
          onChange={setBody}
        />
      </div>
    </div>
  );
}
