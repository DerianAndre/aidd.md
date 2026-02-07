import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listAllSessions } from '../../../lib/tauri';
import type { SessionState, SessionObservation } from '../../../lib/types';

interface SessionsStoreState {
  activeSessions: SessionState[];
  completedSessions: SessionState[];
  loading: boolean;
  stale: boolean;

  fetchAll: (projectRoot?: string) => Promise<void>;
  fetchObservations: (projectRoot: string, sessionId: string, status: 'active' | 'completed') => Promise<SessionObservation[]>;
  invalidate: () => void;
}

export const useSessionsStore = create<SessionsStoreState>((set, get) => ({
  activeSessions: [],
  completedSessions: [],
  loading: false,
  stale: true,

  fetchAll: async (_projectRoot?: string) => {
    if (!get().stale && (get().activeSessions.length + get().completedSessions.length > 0)) return;
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

      set({ activeSessions: active, completedSessions: completed, loading: false, stale: false });
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

  invalidate: () => set({ stale: true }),
}));
