import { create } from 'zustand';

interface NavigationStoreState {
  sidebarCollapsed: boolean;
  breadcrumbs: Array<{ label: string; path: string }>;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setBreadcrumbs: (crumbs: Array<{ label: string; path: string }>) => void;
}

export const useNavigationStore = create<NavigationStoreState>((set) => ({
  sidebarCollapsed: false,
  breadcrumbs: [],

  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),

  setBreadcrumbs: (crumbs) =>
    set({ breadcrumbs: crumbs }),
}));
