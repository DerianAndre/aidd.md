import { create } from 'zustand';

const SIDEBAR_STATE_KEY = 'sidebar:state';

/**
 * Get initial sidebar state from localStorage
 * @returns true if collapsed, false if open (default)
 */
function getInitialSidebarState(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
  return stored ? JSON.parse(stored) : false; // default open
}

interface NavigationStoreState {
  sidebarCollapsed: boolean;
  breadcrumbs: Array<{ label: string; path: string }>;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setBreadcrumbs: (crumbs: Array<{ label: string; path: string }>) => void;
}

export const useNavigationStore = create<NavigationStoreState>((set, get) => ({
  sidebarCollapsed: getInitialSidebarState(),
  breadcrumbs: [],

  toggleSidebar: () => {
    const collapsed = !get().sidebarCollapsed;
    get().setSidebarCollapsed(collapsed);
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(collapsed));
    }
  },

  setBreadcrumbs: (crumbs) =>
    set({ breadcrumbs: crumbs }),
}));
