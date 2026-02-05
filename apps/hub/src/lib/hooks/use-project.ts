import { useProjectStore } from '../../stores/project-store';

/**
 * Hook to access the active project info and paths.
 */
export function useProject() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const projects = useProjectStore((s) => s.projects);
  const loading = useProjectStore((s) => s.loading);

  const aiddRoot = activeProject
    ? `${activeProject.path}`
    : null;

  const statePath = activeProject
    ? `${activeProject.path}/.aidd`
    : null;

  return {
    project: activeProject,
    projects,
    loading,
    aiddRoot,
    statePath,
    hasProject: activeProject !== null,
  };
}
