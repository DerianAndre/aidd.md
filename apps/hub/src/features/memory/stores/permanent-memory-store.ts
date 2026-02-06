import { create } from 'zustand';
import { readJsonFile, writeJsonFile, fileExists } from '../../../lib/tauri';
import { normalizePath } from '../../../lib/utils';
import type { DecisionEntry, MistakeEntry, ConventionEntry } from '../../../lib/types';

interface PermanentMemoryStoreState {
  decisions: DecisionEntry[];
  mistakes: MistakeEntry[];
  conventions: ConventionEntry[];
  loading: boolean;
  stale: boolean;
  writing: boolean;

  fetch: (projectRoot: string) => Promise<void>;
  invalidate: () => void;

  addDecision: (projectRoot: string, entry: Omit<DecisionEntry, 'id' | 'createdAt'>) => Promise<void>;
  removeDecision: (projectRoot: string, id: string) => Promise<void>;
  addMistake: (projectRoot: string, entry: Omit<MistakeEntry, 'id' | 'createdAt' | 'lastSeenAt' | 'occurrences'>) => Promise<void>;
  removeMistake: (projectRoot: string, id: string) => Promise<void>;
  addConvention: (projectRoot: string, entry: Omit<ConventionEntry, 'id' | 'createdAt'>) => Promise<void>;
  removeConvention: (projectRoot: string, id: string) => Promise<void>;
}

function memoryDir(root: string) {
  return `${normalizePath(root)}/ai/memory`;
}

function generateId() {
  return crypto.randomUUID();
}

async function readJsonArray<T>(path: string): Promise<T[]> {
  try {
    if (!(await fileExists(path))) return [];
    const data = await readJsonFile(path);
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

export const usePermanentMemoryStore = create<PermanentMemoryStoreState>((set, get) => ({
  decisions: [],
  mistakes: [],
  conventions: [],
  loading: false,
  stale: true,
  writing: false,

  fetch: async (projectRoot) => {
    if (!get().stale || get().writing) return;
    set({ loading: true });
    try {
      const dir = memoryDir(projectRoot);
      const [decisions, mistakes, conventions] = await Promise.all([
        readJsonArray<DecisionEntry>(`${dir}/decisions.json`),
        readJsonArray<MistakeEntry>(`${dir}/mistakes.json`),
        readJsonArray<ConventionEntry>(`${dir}/conventions.json`),
      ]);
      set({ decisions, mistakes, conventions, loading: false, stale: false });
    } catch {
      set({ loading: false, stale: false });
    }
  },

  invalidate: () => {
    if (!get().writing) set({ stale: true });
  },

  addDecision: async (projectRoot, entry) => {
    const dir = memoryDir(projectRoot);
    const path = `${dir}/decisions.json`;
    set({ writing: true });
    try {
      const current = await readJsonArray<DecisionEntry>(path);
      const now = new Date().toISOString();
      const newEntry: DecisionEntry = { ...entry, id: generateId(), createdAt: now };
      const updated = [newEntry, ...current];
      await writeJsonFile(path, updated);
      set({ decisions: updated, writing: false });
    } catch {
      set({ writing: false });
    }
  },

  removeDecision: async (projectRoot, id) => {
    const dir = memoryDir(projectRoot);
    const path = `${dir}/decisions.json`;
    set({ writing: true });
    try {
      const current = get().decisions.filter((d) => d.id !== id);
      await writeJsonFile(path, current);
      set({ decisions: current, writing: false });
    } catch {
      set({ writing: false });
    }
  },

  addMistake: async (projectRoot, entry) => {
    const dir = memoryDir(projectRoot);
    const path = `${dir}/mistakes.json`;
    set({ writing: true });
    try {
      const current = await readJsonArray<MistakeEntry>(path);
      const now = new Date().toISOString();
      const newEntry: MistakeEntry = { ...entry, id: generateId(), createdAt: now, lastSeenAt: now, occurrences: 1 };
      const updated = [newEntry, ...current];
      await writeJsonFile(path, updated);
      set({ mistakes: updated, writing: false });
    } catch {
      set({ writing: false });
    }
  },

  removeMistake: async (projectRoot, id) => {
    const dir = memoryDir(projectRoot);
    const path = `${dir}/mistakes.json`;
    set({ writing: true });
    try {
      const current = get().mistakes.filter((m) => m.id !== id);
      await writeJsonFile(path, current);
      set({ mistakes: current, writing: false });
    } catch {
      set({ writing: false });
    }
  },

  addConvention: async (projectRoot, entry) => {
    const dir = memoryDir(projectRoot);
    const path = `${dir}/conventions.json`;
    set({ writing: true });
    try {
      const current = await readJsonArray<ConventionEntry>(path);
      const now = new Date().toISOString();
      const newEntry: ConventionEntry = { ...entry, id: generateId(), createdAt: now };
      const updated = [newEntry, ...current];
      await writeJsonFile(path, updated);
      set({ conventions: updated, writing: false });
    } catch {
      set({ writing: false });
    }
  },

  removeConvention: async (projectRoot, id) => {
    const dir = memoryDir(projectRoot);
    const path = `${dir}/conventions.json`;
    set({ writing: true });
    try {
      const current = get().conventions.filter((c) => c.id !== id);
      await writeJsonFile(path, current);
      set({ conventions: current, writing: false });
    } catch {
      set({ writing: false });
    }
  },
}));
