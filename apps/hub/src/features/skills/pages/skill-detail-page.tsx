import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@heroui/react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/page-header';
import { BlockEditor } from '../../../components/editor';
import { SkillMetadata } from '../components/skill-metadata';
import { readFile } from '../../../lib/tauri';
import { useProjectStore } from '../../../stores/project-store';
import { parseSkillContent } from '../lib/parse-skill';
import type { SkillEntity } from '../lib/types';

export function SkillDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const activeProject = useProjectStore((s) => s.activeProject);
  const [skill, setSkill] = useState<SkillEntity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject?.path || !name) return;
    void (async () => {
      setLoading(true);
      const dirPath = `${activeProject.path}/skills/${decodeURIComponent(name)}`;
      const filePath = `${dirPath}/SKILL.md`;
      try {
        const content = await readFile(filePath);
        setSkill(parseSkillContent(content, filePath, dirPath));
      } catch {
        setSkill(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeProject?.path, name]);

  if (loading) {
    return <div className="p-4 text-default-400">Loading...</div>;
  }

  if (!skill) {
    return (
      <div>
        <PageHeader title="Skill Not Found" />
        <Button variant="ghost" size="sm" onPress={() => navigate('/skills')}>
          <ArrowLeft size={16} /> Back to Skills
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={skill.name}
        description={skill.description}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onPress={() => navigate('/skills')}>
              <ArrowLeft size={16} /> Back
            </Button>
            <Button variant="outline" size="sm" onPress={() => navigate(`/skills/${name}/edit`)}>
              <Pencil size={16} /> Edit
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <SkillMetadata skill={skill} />
      </div>

      <div className="rounded-xl border border-default-200">
        <BlockEditor initialMarkdown={skill.content} editable={false} />
      </div>
    </div>
  );
}
