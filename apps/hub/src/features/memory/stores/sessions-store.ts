import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listAllSessions, deleteSession, updateSession } from '../../../lib/tauri';
import type { SessionState, SessionObservation } from '../../../lib/types';

const STALE_TTL = 30_000; // 30 seconds

interface SessionsStoreState {
  activeSessions: SessionState[];
  completedSessions: SessionState[];
  loading: boolean;
  stale: boolean;
  lastFetchedAt: number;

  fetchAll: (projectRoot?: string) => Promise<void>;
  fetchObservations: (projectRoot: string, sessionId: string, status: 'active' | 'completed') => Promise<SessionObservation[]>;
  removeSession: (id: string) => Promise<void>;
  editSession: (id: string, branch?: string, input?: string, output?: string) => Promise<void>;
  invalidate: () => void;
}

export const useSessionsStore = create<SessionsStoreState>((set, get) => ({
  activeSessions: [],
  completedSessions: [],
  loading: false,
  stale: true,
  lastFetchedAt: 0,

  fetchAll: async (_projectRoot?: string) => {
    const { stale, lastFetchedAt, loading } = get();
    if (loading) return;
    const isExpired = Date.now() - lastFetchedAt > STALE_TTL;
    if (!stale && !isExpired) return;
    set({ loading: true });
    try {
      const raw = await listAllSessions(200);
      const sessions = (raw ?? []) as SessionState[];

      const active = sessions
        .filter((s) => !s.endedAt)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      const completed = sessions
        .filter((s) => !!s.endedAt)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

      set({ activeSessions: active, completedSessions: completed, loading: false, stale: false, lastFetchedAt: Date.now() });
    } catch {
      set({ loading: false, stale: false });
    }
  },

  fetchObservations: async (_projectRoot, sessionId, _status) => {
    try {
      const results = await invoke<Array<{ id: string; session_id: string; title: string; type: string; created_at: string }>>('search_observations', { query: sessionId, limit: 100 });
      return (results ?? [])
        .filter((o) => o.session_id === sessionId)
        .map((o) => ({
          id: o.id,
          sessionId: o.session_id,
          type: o.type as SessionObservation['type'],
          title: o.title,
          createdAt: o.created_at,
        })) as SessionObservation[];
    } catch {
      return [];
    }
  },

  removeSession: async (id) => {
    await deleteSession(id);
    set({
      activeSessions: get().activeSessions.filter((s) => s.id !== id),
      completedSessions: get().completedSessions.filter((s) => s.id !== id),
    });
  },

  editSession: async (id, branch, input, output) => {
    await updateSession(id, branch, input, output);
    const updateFn = (s: SessionState) =>
      s.id === id
        ? { ...s, ...(branch !== undefined && { branch }), ...(input !== undefined && { input }), ...(output !== undefined && { output }) }
        : s;
    set({
      activeSessions: get().activeSessions.map(updateFn),
      completedSessions: get().completedSessions.map(updateFn),
    });
  },

  invalidate: () => set({ stale: true }),
}));
