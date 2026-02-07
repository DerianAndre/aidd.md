import { create } from 'zustand';
import {
  addProject,
  detectProject,
  getActiveProject,
  listProjects,
  removeProject,
  setActiveProject,
  type ProjectEntry,
  type ProjectInfo,
} from '../lib/tauri';

interface ProjectStoreState {
  projects: ProjectEntry[];
  activeProject: ProjectInfo | null;
  loading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  addAndDetect: (path: string) => Promise<ProjectInfo>;
  remove: (path: string) => Promise<void>;
  switchProject: (path: string) => Promise<void>;
  refreshProject: (path: string) => Promise<ProjectInfo>;
}

export const useProjectStore = create<ProjectStoreState>((set) => ({
  projects: [],
  activeProject: null,
  loading: true,
  error: null,

  initialize: async () => {
    try {
      set({ loading: true, error: null });
      const projects = await listProjects();
      const activePath = await getActiveProject();

      let activeProject: ProjectInfo | null = null;
      if (activePath) {
        activeProject = await detectProject(activePath);
      }

      set({ projects, activeProject, loading: false });
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },

  addAndDetect: async (path: string) => {
    const info = await addProject(path);
    const projects = await listProjects();
    set({ projects, activeProject: info });
    return info;
  },

  remove: async (path: string) => {
    await removeProject(path);
    const projects = await listProjects();
    const activePath = await getActiveProject();

    let activeProject: ProjectInfo | null = null;
    if (activePath) {
      activeProject = await detectProject(activePath);
    }

    set({ projects, activeProject });
  },

  switchProject: async (path: string) => {
    await setActiveProject(path);
    const info = await detectProject(path);
    set({ activeProject: info });
  },

  refreshProject: async (path: string) => {
    const info = await detectProject(path);
    const state = useProjectStore.getState();
    if (state.activeProject?.path === path) {
      set({ activeProject: info });
    }
    return info;
  },
}));
