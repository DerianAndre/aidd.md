import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@heroui/react';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { BlockEditor, FrontmatterForm, type FieldDefinition } from '../../../components/editor';
import { readFile, writeFile } from '../../../lib/tauri';
import { useProjectStore } from '../../../stores/project-store';
import { useKnowledgeStore } from '../stores/knowledge-store';
import { parseFrontmatter, serializeFrontmatter } from '../../../lib/markdown';

const KNOWLEDGE_FIELDS: FieldDefinition[] = [
  { type: 'text', key: 'name', label: 'Name', required: true },
  { type: 'text', key: 'category', label: 'Category' },
  {
    type: 'select',
    key: 'maturity',
    label: 'Maturity',
    options: [
      { label: 'Emerging', value: 'emerging' },
      { label: 'Growing', value: 'growing' },
      { label: 'Stable', value: 'stable' },
      { label: 'Declining', value: 'declining' },
    ],
  },
  { type: 'text', key: 'last_updated', label: 'Last Updated', placeholder: 'YYYY-MM-DD' },
];

export function KnowledgeEditorPage() {
  const { '*': pathParam } = useParams();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const invalidate = useKnowledgeStore((s) => s.invalidate);

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
      const path = `${activeProject.path}/knowledge/${pathParam}.md`;
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
    return <div className="p-4 text-default-400">Loading...</div>;
  }

  return (
    <div>
      <PageHeader
        title={`Edit: ${pathParam ?? ''}`}
        description="Edit knowledge entry"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onPress={() => navigate('/knowledge')}>
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
          fields={KNOWLEDGE_FIELDS}
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
