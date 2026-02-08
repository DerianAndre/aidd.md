import { create } from 'zustand';
import { listDrafts } from '../../../lib/tauri';
import type { DraftEntry } from '../../../lib/types';

const STALE_TTL = 30_000;

interface DraftsStoreState {
  drafts: DraftEntry[];
  selectedDraftId: string | null;
  draftContent: string | null;
  loading: boolean;
  stale: boolean;
  lastFetchedAt: number;

  fetch: (projectRoot?: string) => Promise<void>;
  selectDraft: (draft: DraftEntry) => void;
  clearSelection: () => void;
  invalidate: () => void;
}

export const useDraftsStore = create<DraftsStoreState>((set, get) => ({
  drafts: [],
  selectedDraftId: null,
  draftContent: null,
  loading: false,
  stale: true,
  lastFetchedAt: 0,

  fetch: async (_projectRoot?: string) => {
    const { stale, lastFetchedAt, loading } = get();
    if (loading) return;
    const isExpired = Date.now() - lastFetchedAt > STALE_TTL;
    if (!stale && !isExpired) return;
    set({ loading: true });
    try {
      const raw = await listDrafts();
      const drafts = ((raw ?? []) as DraftEntry[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      set({ drafts, loading: false, stale: false, lastFetchedAt: Date.now() });
    } catch {
      set({ drafts: [], loading: false, stale: false });
    }
  },

  selectDraft: (draft) => {
    set({
      selectedDraftId: draft.id,
      draftContent: draft.content ?? null,
    });
  },

  clearSelection: () => set({ selectedDraftId: null, draftContent: null }),

  invalidate: () => set({ stale: true }),
}));
