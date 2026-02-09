import { create } from 'zustand';
import {
  listDrafts,
  approveDraft as approveDraftCommand,
  rejectDraft,
  createDraft,
  updateDraft,
  deleteDraft,
} from '../../../lib/tauri';
import type { DraftEntry, DraftCategory } from '../../../lib/types';
import { useSessionsStore } from '../../memory/stores/sessions-store';
import { useArtifactsStore } from '../../artifacts/stores/artifacts-store';

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

  approveDraft: (id: string) => Promise<void>;
  rejectDraft: (id: string, reason: string) => Promise<void>;
  addDraft: (category: DraftCategory, title: string, filename: string, content: string, confidence: number, source: string) => Promise<void>;
  editDraft: (id: string, title: string, content: string, category: DraftCategory, confidence?: number, filename?: string) => Promise<void>;
  removeDraft: (id: string) => Promise<void>;
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

  approveDraft: async (id) => {
    await approveDraftCommand(id);
    set({
      drafts: get().drafts.map((d) =>
        d.id === id ? { ...d, status: 'approved' as const } : d,
      ),
    });
    useSessionsStore.getState().invalidate();
    useArtifactsStore.getState().invalidate();
    void useSessionsStore.getState().fetchAll();
    void useArtifactsStore.getState().fetch();
  },

  rejectDraft: async (id, reason) => {
    await rejectDraft(id, reason);
    set({
      drafts: get().drafts.map((d) =>
        d.id === id ? { ...d, status: 'rejected' as const, rejectedReason: reason } : d,
      ),
    });
  },

  addDraft: async (category, title, filename, content, confidence, source) => {
    await createDraft(category, title, filename, content, confidence, source);
    set({ stale: true });
    get().fetch();
  },

  editDraft: async (id, title, content, category, confidence, filename) => {
    await updateDraft(id, title, content, category, confidence, filename);
    set({ stale: true });
    get().fetch();
  },

  removeDraft: async (id) => {
    await deleteDraft(id);
    set({ drafts: get().drafts.filter((d) => d.id !== id) });
  },
}));
