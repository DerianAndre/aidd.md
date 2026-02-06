import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@heroui/react';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { BlockEditor } from '../../../components/editor';
import { readFile, writeFile } from '../../../lib/tauri';
import { useProjectStore } from '../../../stores/project-store';
import { useRulesStore } from '../stores/rules-store';

export function RuleEditorPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const invalidate = useRulesStore((s) => s.invalidate);

  const [content, setContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filePath, setFilePath] = useState('');

  useEffect(() => {
    if (!activeProject?.path || !name) return;
    void (async () => {
      setLoading(true);
      const path = `${activeProject.path}/rules/${decodeURIComponent(name)}.md`;
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
    return <div className="p-4 text-default-400">Loading...</div>;
  }

  return (
    <div>
      <PageHeader
        title={decodeURIComponent(name ?? '')}
        description="Edit rule"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onPress={() => navigate('/rules')}>
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

      <div className="rounded-xl border border-default-200">
        <BlockEditor
          initialMarkdown={content}
          editable={true}
          onChange={setEditedContent}
        />
      </div>
    </div>
  );
}
