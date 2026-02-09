import { create } from 'zustand';
import {
  listAllSessions,
  listArtifacts,
  listAllObservations,
  listObservationsBySession,
  listAuditScores,
  deleteSession,
  updateSession,
  updateSessionFull,
} from '../../../lib/tauri';
import type {
  SessionState,
  SessionObservation,
  SessionUpdatePayload,
  ArtifactEntry,
  AuditScore,
} from '../../../lib/types';
import {
  deriveWorkflowComplianceMap,
  type WorkflowCompliance,
} from '../lib/workflow-compliance';

const STALE_TTL = 30_000; // 30 seconds

interface SessionsStoreState {
  activeSessions: SessionState[];
  completedSessions: SessionState[];
  complianceBySessionId: Record<string, WorkflowCompliance>;
  artifactsBySessionId: Record<string, ArtifactEntry[]>;
  observationsBySessionId: Record<string, number>;
  auditScoresBySessionId: Record<string, AuditScore>;
  loading: boolean;
  stale: boolean;
  lastFetchedAt: number;

  fetchAll: (projectRoot?: string) => Promise<void>;
  fetchObservations: (projectRoot: string, sessionId: string, status: 'active' | 'completed') => Promise<SessionObservation[]>;
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
  artifactsBySessionId: {},
  observationsBySessionId: {},
  auditScoresBySessionId: {},
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
      const [rawSessions, rawArtifacts] = await Promise.all([
        listAllSessions(400),
        listArtifacts(undefined, undefined, 2000).catch(() => [] as unknown[]),
      ]);
      const sessions = (rawSessions ?? []) as SessionState[];
      const artifacts = (rawArtifacts ?? []) as ArtifactEntry[];

      const observationLimit = Math.min(5000, Math.max(300, sessions.length * 25));
      const auditLimit = Math.min(5000, Math.max(300, sessions.length * 8));
      const [rawObservations, rawAuditScores] = await Promise.all([
        listAllObservations(observationLimit).catch(() => [] as unknown[]),
        listAuditScores(auditLimit).catch(() => [] as unknown[]),
      ]);
      const observations = (rawObservations ?? []) as SessionObservation[];
      const auditScores = ((rawAuditScores ?? []) as AuditScore[])
        .filter((score) => !!score.sessionId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

      const observationsBySessionId = observations.reduce((acc, observation) => {
        acc[observation.sessionId] = (acc[observation.sessionId] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const auditScoresBySessionId: Record<string, AuditScore> = {};
      for (const score of auditScores) {
        if (!score.sessionId) continue;
        if (!auditScoresBySessionId[score.sessionId]) {
          auditScoresBySessionId[score.sessionId] = score;
        }
      }

      set({
        activeSessions: active,
        completedSessions: completed,
        complianceBySessionId,
        artifactsBySessionId,
        observationsBySessionId,
        auditScoresBySessionId,
        loading: false,
        stale: false,
        lastFetchedAt: Date.now(),
      });
    } catch {
      set({
        loading: false,
        stale: false,
        complianceBySessionId: {},
        observationsBySessionId: {},
        auditScoresBySessionId: {},
      });
    }
  },

  fetchObservations: async (_projectRoot, sessionId, _status) => {
    try {
      const observations = await listObservationsBySession(sessionId, 1000);
      return (observations ?? []) as SessionObservation[];
    } catch {
      return [];
    }
  },

  removeSession: async (id) => {
    await deleteSession(id);
    const nextCompliance = { ...get().complianceBySessionId };
    const nextArtifacts = { ...get().artifactsBySessionId };
    const nextObservations = { ...get().observationsBySessionId };
    const nextAuditScores = { ...get().auditScoresBySessionId };
    delete nextCompliance[id];
    delete nextArtifacts[id];
    delete nextObservations[id];
    delete nextAuditScores[id];
    set({
      activeSessions: get().activeSessions.filter((s) => s.id !== id),
      completedSessions: get().completedSessions.filter((s) => s.id !== id),
      complianceBySessionId: nextCompliance,
      artifactsBySessionId: nextArtifacts,
      observationsBySessionId: nextObservations,
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
