import { create } from 'zustand';
import {
  listAllSessions,
  listArtifacts,
  listAllObservations,
  listObservationsBySession,
  listAuditScores,
  listDrafts,
  createDraft,
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
  DraftEntry,
} from '../../../lib/types';
import {
  deriveWorkflowComplianceMap,
  getMissingRequiredArtifacts,
  type WorkflowCompliance,
} from '../lib/workflow-compliance';
import { getSessionStartedMs } from '../lib/session-time';

const STALE_TTL = 30_000; // 30 seconds
const AUTO_DRAFT_PREFIX = 'Auto Draft:';

function buildAutoDraftTitle(artifactType: string, sessionId: string): string {
  return `${AUTO_DRAFT_PREFIX} ${artifactType} for session ${sessionId}`;
}

function extractAutoDraftSessionId(title: string): string | null {
  const match = title.match(/^Auto Draft:\s+\w+\s+for session\s+([a-z0-9-]+)$/i);
  return match?.[1] ?? null;
}

function buildAutoDraftContent(
  artifactType: string,
  session: SessionState,
  observations: SessionObservation[],
): string {
  const snippets = observations
    .filter((obs) => (obs.narrative ?? '').trim().length > 0)
    .slice(0, 5)
    .map((obs) => `- ${obs.title}: ${(obs.narrative ?? '').trim().slice(0, 180)}`);

  return [
    `# Auto-Generated ${artifactType.toUpperCase()} Draft`,
    '',
    `- sessionId: ${session.id}`,
    `- artifactType: ${artifactType}`,
    '- pendingApproval: true',
    '',
    '## Session Intent',
    session.input?.trim() || '(no input recorded)',
    '',
    '## Proposed Content',
    `This draft was auto-generated to satisfy workflow compliance for **${artifactType}**.`,
    '',
    '## Evidence',
    ...(snippets.length > 0 ? snippets : ['- No narrative observations available; review manually.']),
    '',
    '## Next Step',
    '- Review this draft, refine details, then approve and ship.',
  ].join('\n');
}

interface SessionsStoreState {
  activeSessions: SessionState[];
  completedSessions: SessionState[];
  complianceBySessionId: Record<string, WorkflowCompliance>;
  artifactsBySessionId: Record<string, ArtifactEntry[]>;
  pendingDraftsBySession: Record<string, number>;
  draftStatusBySession: Record<string, { pending: number; approved: number; rejected: number }>;
  observationsBySessionId: Record<string, number>;
  auditScoresBySessionId: Record<string, AuditScore>;
  loading: boolean;
  stale: boolean;
  lastFetchedAt: number;

  fetchAll: (projectRoot?: string) => Promise<void>;
  fetchObservations: (projectRoot: string, sessionId: string, status: 'active' | 'completed') => Promise<SessionObservation[]>;
  removeSession: (id: string) => Promise<void>;
  completeSession: (id: string) => Promise<void>;
  fixCompliance: (id: string) => Promise<{
    created: number;
    skippedExisting: number;
    pendingAfter: number;
    missingRequired: string[];
  }>;
  editSession: (id: string, branch?: string, input?: string, output?: string) => Promise<void>;
  editSessionFull: (id: string, updates: SessionUpdatePayload) => Promise<void>;
  invalidate: () => void;
}

export const useSessionsStore = create<SessionsStoreState>((set, get) => ({
  activeSessions: [],
  completedSessions: [],
  complianceBySessionId: {},
  artifactsBySessionId: {},
  pendingDraftsBySession: {},
  draftStatusBySession: {},
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
      const rawDrafts = await listDrafts().catch(() => [] as unknown[]);
      const observations = (rawObservations ?? []) as SessionObservation[];
      const auditScores = ((rawAuditScores ?? []) as AuditScore[])
        .filter((score) => !!score.sessionId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const drafts = (rawDrafts ?? []) as DraftEntry[];

      const active = sessions
        .filter((s) => !s.endedAt)
        .sort((a, b) => getSessionStartedMs(b) - getSessionStartedMs(a));
      const completed = sessions
        .filter((s) => !!s.endedAt)
        .sort((a, b) => getSessionStartedMs(b) - getSessionStartedMs(a));
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
      const draftStatusBySession = drafts.reduce((acc, draft) => {
        const sid = draft.sessionId ?? extractAutoDraftSessionId(draft.title);
        if (!sid) return acc;
        if (!acc[sid]) {
          acc[sid] = { pending: 0, approved: 0, rejected: 0 };
        }
        if (draft.status === 'pending') {
          acc[sid].pending += 1;
        } else if (draft.status === 'approved') {
          acc[sid].approved += 1;
        } else if (draft.status === 'rejected') {
          acc[sid].rejected += 1;
        }
        return acc;
      }, {} as Record<string, { pending: number; approved: number; rejected: number }>);

      const pendingDraftsBySession = Object.entries(draftStatusBySession).reduce((acc, [sid, summary]) => {
        if (summary.pending > 0) {
          acc[sid] = summary.pending;
        }
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
        pendingDraftsBySession,
        draftStatusBySession,
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
        pendingDraftsBySession: {},
        draftStatusBySession: {},
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
    const nextPendingDrafts = { ...get().pendingDraftsBySession };
    const nextDraftStatus = { ...get().draftStatusBySession };
    delete nextCompliance[id];
    delete nextArtifacts[id];
    delete nextObservations[id];
    delete nextAuditScores[id];
    delete nextPendingDrafts[id];
    delete nextDraftStatus[id];
    set({
      activeSessions: get().activeSessions.filter((s) => s.id !== id),
      completedSessions: get().completedSessions.filter((s) => s.id !== id),
      complianceBySessionId: nextCompliance,
      artifactsBySessionId: nextArtifacts,
      pendingDraftsBySession: nextPendingDrafts,
      draftStatusBySession: nextDraftStatus,
      observationsBySessionId: nextObservations,
      auditScoresBySessionId: nextAuditScores,
    });
  },

  completeSession: async (id) => {
    await get().fixCompliance(id);
    const endedAt = Date.now();
    await updateSessionFull(id, JSON.stringify({ endedAt }));
    set({ stale: true });
    await get().fetchAll();
  },

  fixCompliance: async (id) => {
    const startedAt = performance.now();
    const state = get();
    const sessions = [...state.activeSessions, ...state.completedSessions];
    const session = sessions.find((s) => s.id === id);
    if (!session) {
      return {
        created: 0,
        skippedExisting: 0,
        pendingAfter: 0,
        missingRequired: [],
      };
    }

    const artifacts = state.artifactsBySessionId[id] ?? [];
    const missing = getMissingRequiredArtifacts(session, artifacts);
    if (missing.length === 0) {
      return {
        created: 0,
        skippedExisting: 0,
        pendingAfter: state.draftStatusBySession[id]?.pending ?? 0,
        missingRequired: [],
      };
    }

    const rawDrafts = await listDrafts().catch(() => [] as unknown[]);
    const drafts = (rawDrafts ?? []) as DraftEntry[];
    const existingTitles = new Set(
      drafts
        .filter((draft) => draft.status === 'pending')
        .map((draft) => draft.title),
    );

    const observations = await listObservationsBySession(session.id, 250).catch(() => [] as unknown[]);
    const sessionObservations = (observations ?? []) as SessionObservation[];
    let created = 0;
    let skippedExisting = 0;

    for (const artifactType of missing) {
      const title = buildAutoDraftTitle(artifactType, session.id);
      if (existingTitles.has(title)) {
        skippedExisting += 1;
        continue;
      }

      const filename = `auto-${artifactType}-${session.id.slice(0, 8)}.md`;
      const content = buildAutoDraftContent(artifactType, session, sessionObservations);
      await createDraft('workflows', title, filename, content, 90, 'manual');
      created += 1;
    }

    const governanceOverheadMs = Math.max(0, Math.round(performance.now() - startedAt));
    if (governanceOverheadMs > 0) {
      await updateSessionFull(
        id,
        JSON.stringify({
          timingMetrics: {
            governanceOverheadMs,
          },
        }),
      );
    }

    set({ stale: true });
    await get().fetchAll();
    return {
      created,
      skippedExisting,
      pendingAfter: get().draftStatusBySession[id]?.pending ?? 0,
      missingRequired: missing,
    };
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
      if (updates.startedAt !== undefined) {
        if (typeof updates.startedAt === 'number') {
          merged.startedAtTs = updates.startedAt;
          merged.startedAt = new Date(updates.startedAt).toISOString();
        } else {
          merged.startedAt = updates.startedAt;
        }
      }
      if (updates.endedAt !== undefined) {
        if (updates.endedAt === null) {
          merged.endedAt = undefined;
          merged.endedAtTs = undefined;
        } else if (typeof updates.endedAt === 'number') {
          merged.endedAtTs = updates.endedAt;
          merged.endedAt = new Date(updates.endedAt).toISOString();
        } else {
          merged.endedAt = updates.endedAt;
        }
      }
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
      if (updates.timingMetrics !== undefined) {
        const currentTiming = (merged.timingMetrics as {
          startupMs?: number;
          governanceOverheadMs?: number;
        } | undefined) ?? {};
        const mergedTiming: {
          startupMs?: number;
          governanceOverheadMs?: number;
        } = {
          ...currentTiming,
          ...updates.timingMetrics,
        };
        if (updates.timingMetrics.governanceOverheadMs != null) {
          mergedTiming.governanceOverheadMs = (currentTiming.governanceOverheadMs ?? 0)
            + updates.timingMetrics.governanceOverheadMs;
        }
        merged.timingMetrics = mergedTiming as SessionState['timingMetrics'];
      }
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
