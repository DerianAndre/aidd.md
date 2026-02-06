import { create } from 'zustand';
import { listDirectory, readJsonFile } from '../../../lib/tauri';
import { normalizePath } from '../../../lib/utils';
import type { SessionState, SessionObservation } from '../../../lib/types';

interface SessionsStoreState {
  activeSessions: SessionState[];
  completedSessions: SessionState[];
  loading: boolean;
  stale: boolean;

  fetchAll: (projectRoot: string) => Promise<void>;
  fetchObservations: (projectRoot: string, sessionId: string, status: 'active' | 'completed') => Promise<SessionObservation[]>;
  invalidate: () => void;
}

async function loadSessions(dirPath: string): Promise<SessionState[]> {
  try {
    const files = await listDirectory(dirPath, ['json']);
    const sessionFiles = files.filter((f) => !f.name.includes('-observations'));
    const sessions = await Promise.all(
      sessionFiles.map((f) => readJsonFile(f.path) as Promise<SessionState>),
    );
    return sessions.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
  } catch {
    return [];
  }
}

export const useSessionsStore = create<SessionsStoreState>((set, get) => ({
  activeSessions: [],
  completedSessions: [],
  loading: false,
  stale: true,

  fetchAll: async (projectRoot) => {
    if (!get().stale && (get().activeSessions.length + get().completedSessions.length > 0)) return;
    set({ loading: true });
    try {
      const base = `${normalizePath(projectRoot)}/.aidd/sessions`;
      const [active, completed] = await Promise.all([
        loadSessions(`${base}/active`),
        loadSessions(`${base}/completed`),
      ]);
      set({ activeSessions: active, completedSessions: completed, loading: false, stale: false });
    } catch {
      set({ loading: false, stale: false });
    }
  },

  fetchObservations: async (projectRoot, sessionId, status) => {
    try {
      const base = `${normalizePath(projectRoot)}/.aidd/sessions/${status}`;
      const data = await readJsonFile(`${base}/${sessionId}-observations.json`);
      return (data as SessionObservation[]) ?? [];
    } catch {
      return [];
    }
  },

  invalidate: () => set({ stale: true }),
}));
