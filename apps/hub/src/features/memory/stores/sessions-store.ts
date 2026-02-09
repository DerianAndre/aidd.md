import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listAllSessions, listArtifacts, deleteSession, updateSession, updateSessionFull } from '../../../lib/tauri';
import type { SessionState, SessionObservation, SessionUpdatePayload, ArtifactEntry } from '../../../lib/types';
import {
  deriveWorkflowComplianceMap,
  type WorkflowCompliance,
} from '../lib/workflow-compliance';

const STALE_TTL = 30_000; // 30 seconds

// Audit score type (matching Pattern Killer audit structure)
export interface AuditScore {
  sessionId: string;
  totalScore: number;
  dimensions: {
    lexicalDiversity: number;
    structuralVariation: number;
    voiceAuthenticity: number;
    patternAbsence: number;
    semanticPreservation: number;
    tidBonus?: number;
  };
  patternsFound: number;
  verdict: 'pass' | 'retry' | 'escalate';
  createdAt: string;
}

interface SessionsStoreState {
  activeSessions: SessionState[];
  completedSessions: SessionState[];
  complianceBySessionId: Record<string, WorkflowCompliance>;
  artifactsBySessionId: Record<string, ArtifactEntry[]>; // NEW
  auditScoresBySessionId: Record<string, AuditScore>; // NEW
  loading: boolean;
  loadingAuditScores: boolean; // NEW
  stale: boolean;
  lastFetchedAt: number;

  fetchAll: (projectRoot?: string) => Promise<void>;
  fetchObservations: (projectRoot: string, sessionId: string, status: 'active' | 'completed') => Promise<SessionObservation[]>;
  fetchAuditScores: (sessionIds: string[]) => Promise<void>; // NEW
  removeSession: (id: string) => Promise<void>;
  completeSession: (id: string) => Promise<void>;
  editSession: (id: string, branch?: string, input?: string, output?: string) => Promise<void>;
  editSessionFull: (id: string, updates: SessionUpdatePayload) => Promise<void>;
  invalidate: () => void;
}

export const useSessionsStore = create<SessionsStoreState>((set, get) => ({
  activeSessions: [],
  completedSessions: [],
  complianceBySessionId: {},
  artifactsBySessionId: {}, // NEW
  auditScoresBySessionId: {}, // NEW
  loading: false,
  loadingAuditScores: false, // NEW
  stale: true,
  lastFetchedAt: 0,

  fetchAll: async (_projectRoot?: string) => {
    const { stale, lastFetchedAt, loading } = get();
    if (loading) return;
    const isExpired = Date.now() - lastFetchedAt > STALE_TTL;
    if (!stale && !isExpired) return;
    set({ loading: true });
    try {
      const [raw, rawArtifacts] = await Promise.all([
        listAllSessions(200),
        listArtifacts(undefined, undefined, 500).catch(() => [] as unknown[]),
      ]);
      const sessions = (raw ?? []) as SessionState[];
      const artifacts = (rawArtifacts ?? []) as ArtifactEntry[];

      const active = sessions
        .filter((s) => !s.endedAt)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      const completed = sessions
        .filter((s) => !!s.endedAt)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      const complianceBySessionId = deriveWorkflowComplianceMap(sessions, artifacts);

      // Map artifacts to sessions for efficient lookup
      const artifactsBySessionId = artifacts.reduce((acc, artifact) => {
        const sessionId = artifact.sessionId;
        if (!sessionId) {
          // Legacy fallback: try to match by feature/branch
          const matchingSession = sessions.find(s =>
            s.branch.toLowerCase() === artifact.feature.toLowerCase()
          );
          if (matchingSession) {
            const sid = matchingSession.id;
            if (!acc[sid]) acc[sid] = [];
            acc[sid].push(artifact);
          }
          return acc;
        }
        if (!acc[sessionId]) acc[sessionId] = [];
        acc[sessionId].push(artifact);
        return acc;
      }, {} as Record<string, ArtifactEntry[]>);

      set({
        activeSessions: active,
        completedSessions: completed,
        complianceBySessionId,
        artifactsBySessionId,
        loading: false,
        stale: false,
        lastFetchedAt: Date.now(),
      });
    } catch {
      set({ loading: false, stale: false, complianceBySessionId: {} });
    }
  },

  fetchAuditScores: async (sessionIds: string[]) => {
    if (sessionIds.length === 0) return;

    set({ loadingAuditScores: true });

    try {
      // Query audit scores for multiple sessions in parallel
      // Note: This requires the query_audit_scores Tauri command to be implemented
      const scores = await Promise.all(
        sessionIds.map(async (sessionId) => {
          try {
            const result = await invoke<AuditScore[]>('query_audit_scores', { sessionId });
            // Return most recent audit score for this session
            return result.length > 0 ? ([sessionId, result[0]] as const) : null;
          } catch (error) {
            console.warn(`Failed to fetch audit score for session ${sessionId}:`, error);
            return null;
          }
        })
      );

      const scoreMap = Object.fromEntries(scores.filter((s): s is [string, AuditScore] => s !== null));

      set(state => ({
        auditScoresBySessionId: { ...state.auditScoresBySessionId, ...scoreMap },
        loadingAuditScores: false,
      }));
    } catch (error) {
      console.error('Failed to fetch audit scores:', error);
      set({ loadingAuditScores: false });
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
    const nextCompliance = { ...get().complianceBySessionId };
    const nextArtifacts = { ...get().artifactsBySessionId };
    const nextAuditScores = { ...get().auditScoresBySessionId };
    delete nextCompliance[id];
    delete nextArtifacts[id];
    delete nextAuditScores[id];
    set({
      activeSessions: get().activeSessions.filter((s) => s.id !== id),
      completedSessions: get().completedSessions.filter((s) => s.id !== id),
      complianceBySessionId: nextCompliance,
      artifactsBySessionId: nextArtifacts,
      auditScoresBySessionId: nextAuditScores,
    });
  },

  completeSession: async (id) => {
    const endedAt = new Date().toISOString();
    await updateSessionFull(id, JSON.stringify({ endedAt }));
    set({ stale: true });
    await get().fetchAll();
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
    set({ stale: true });
    await get().fetchAll();
  },

  editSessionFull: async (id, updates) => {
    await updateSessionFull(id, JSON.stringify(updates));
    // Optimistically merge updates into local state
    const mergeFn = (s: SessionState) => {
      if (s.id !== id) return s;
      const merged = { ...s };
      if (updates.name !== undefined) merged.name = updates.name;
      if (updates.branch !== undefined) merged.branch = updates.branch;
      if (updates.input !== undefined) merged.input = updates.input;
      if (updates.output !== undefined) merged.output = updates.output;
      if (updates.aiProvider) {
        merged.aiProvider = { ...merged.aiProvider, ...updates.aiProvider } as SessionState['aiProvider'];
      }
      if (updates.startedAt !== undefined) merged.startedAt = updates.startedAt;
      if (updates.endedAt !== undefined) merged.endedAt = updates.endedAt ?? undefined;
      if (updates.taskClassification) {
        merged.taskClassification = { ...merged.taskClassification, ...updates.taskClassification } as SessionState['taskClassification'];
      }
      if (updates.outcome) {
        merged.outcome = { ...merged.outcome, ...updates.outcome } as SessionState['outcome'];
      }
      if (updates.tasksCompleted !== undefined) merged.tasksCompleted = updates.tasksCompleted;
      if (updates.tasksPending !== undefined) merged.tasksPending = updates.tasksPending;
      if (updates.filesModified !== undefined) merged.filesModified = updates.filesModified;
      if (updates.decisions !== undefined) merged.decisions = updates.decisions;
      if (updates.errorsResolved !== undefined) merged.errorsResolved = updates.errorsResolved;
      return merged;
    };
    set({
      activeSessions: get().activeSessions.map(mergeFn),
      completedSessions: get().completedSessions.map(mergeFn),
    });
    set({ stale: true });
    await get().fetchAll();
  },

  invalidate: () => set({ stale: true }),
}));
