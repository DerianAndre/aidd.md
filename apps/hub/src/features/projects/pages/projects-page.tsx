import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { FolderPlus } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { PageHeader } from '../../../components/layout/page-header';
import { ProjectCard } from '../components/project-card';
import { useProjectStore } from '../../../stores/project-store';
import { detectProject, type ProjectInfo } from '../../../lib/tauri';

export function ProjectsPage() {
  const { t } = useTranslation();
  const projects = useProjectStore((s) => s.projects);
  const activeProject = useProjectStore((s) => s.activeProject);
  const addAndDetect = useProjectStore((s) => s.addAndDetect);
  const remove = useProjectStore((s) => s.remove);
  const switchProject = useProjectStore((s) => s.switchProject);

  const [projectInfos, setProjectInfos] = useState<Map<string, ProjectInfo>>(new Map());
  const [loading, setLoading] = useState(false);

  // Load full ProjectInfo (with markers) for each registered project
  const loadProjectInfos = async () => {
    const infos = new Map<string, ProjectInfo>();
    for (const p of projects) {
      try {
        const info = await detectProject(p.path);
        infos.set(p.path, info);
      } catch {
        // Keep entry without full info
      }
    }
    setProjectInfos(infos);
  };

  // Load on first render and when projects change
  useState(() => {
    if (projects.length > 0) {
      void loadProjectInfos();
    }
  });

  const handleAddProject = async () => {
    const selected = await open({ directory: true, title: t('page.projects.selectFolder') });
    if (!selected) return;

    setLoading(true);
    try {
      const info = await addAndDetect(selected);
      setProjectInfos((prev) => new Map(prev).set(info.path, info));
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (path: string) => {
    await remove(path);
    setProjectInfos((prev) => {
      const next = new Map(prev);
      next.delete(path);
      return next;
    });
  };

  const handleSetActive = async (path: string) => {
    await switchProject(path);
  };

  const [refreshingPath, setRefreshingPath] = useState<string | null>(null);

  const handleRefresh = useCallback(async (path: string) => {
    setRefreshingPath(path);
    try {
      const info = await detectProject(path);
      setProjectInfos((prev) => new Map(prev).set(path, info));
      // Update active project in store if this is the active one
      const store = useProjectStore.getState();
      if (store.activeProject?.path === path) {
        await store.refreshProject(path);
      }
    } finally {
      setRefreshingPath(null);
    }
  }, []);

  return (
    <div>
      <PageHeader
        title={t('page.projects.title')}
        description={t('page.projects.description')}
        actions={
          <Button
            variant="default"
            size="sm"
            onClick={handleAddProject}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : <FolderPlus size={16} />}
            {t('page.projects.addProject')}
          </Button>
        }
      />

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16">
          <FolderPlus size={48} className="mb-4 text-muted-foreground/50" />
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {t('page.projects.noProjects')}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('page.projects.noProjectsHint')}
          </p>
          <Button variant="default" onClick={handleAddProject}>
            <FolderPlus size={16} />
            {t('page.projects.addProject')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const info = projectInfos.get(p.path);
            if (!info) return null;
            return (
              <ProjectCard
                key={p.path}
                project={info}
                isActive={activeProject?.path === p.path}
                onSetActive={() => handleSetActive(p.path)}
                onRemove={() => handleRemove(p.path)}
                onRefresh={() => handleRefresh(p.path)}
                refreshing={refreshingPath === p.path}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
