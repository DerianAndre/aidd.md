import { create } from 'zustand';
import { readJsonFile, readFile } from '../../../lib/tauri';
import { statePath, STATE_PATHS } from '../../../lib/constants';
import type { DraftEntry } from '../../../lib/types';

interface DraftsStoreState {
  drafts: DraftEntry[];
  selectedDraftId: string | null;
  draftContent: string | null;
  loading: boolean;
  stale: boolean;

  fetch: (projectRoot: string) => Promise<void>;
  selectDraft: (projectRoot: string, draft: DraftEntry) => Promise<void>;
  clearSelection: () => void;
  invalidate: () => void;
}

export const useDraftsStore = create<DraftsStoreState>((set, get) => ({
  drafts: [],
  selectedDraftId: null,
  draftContent: null,
  loading: false,
  stale: true,

  fetch: async (projectRoot) => {
    if (!get().stale) return;
    set({ loading: true });
    try {
      const base = statePath(projectRoot, STATE_PATHS.DRAFTS);
      const manifest = (await readJsonFile(`${base}/manifest.json`)) as {
        drafts?: DraftEntry[];
      };
      const drafts = (manifest.drafts ?? []).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      set({ drafts, loading: false, stale: false });
    } catch {
      set({ drafts: [], loading: false, stale: false });
    }
  },

  selectDraft: async (projectRoot, draft) => {
    set({ selectedDraftId: draft.id, draftContent: null });
    try {
      const base = statePath(projectRoot, STATE_PATHS.DRAFTS);
      const content = await readFile(`${base}/${draft.category}/${draft.id}.md`);
      set({ draftContent: content });
    } catch {
      set({ draftContent: '*(Draft content not found)*' });
    }
  },

  clearSelection: () => set({ selectedDraftId: null, draftContent: null }),

  invalidate: () => set({ stale: true }),
}));
