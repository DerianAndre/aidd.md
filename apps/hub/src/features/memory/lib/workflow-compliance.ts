import type { ArtifactEntry, ArtifactType, SessionState } from '../../../lib/types';
import { computeLifecycleProgress, type LifecycleProgress } from './lifecycle-progress';

export type WorkflowComplianceStatus = 'compliant' | 'non-compliant';

export interface WorkflowCompliance {
  status: WorkflowComplianceStatus;
  required: ArtifactType[];
  missing: ArtifactType[];
  skipped: ArtifactType[];
  fastTrack: boolean;
  lifecycleProgress: LifecycleProgress;
}

const REQUIRED_DEFAULT: ArtifactType[] = ['brainstorm', 'plan', 'checklist', 'retro'];
const FAST_TRACK_DEFAULT_SKIP: string[] = ['brainstorm', 'plan', 'checklist'];

function normalize(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function artifactBelongsToSession(artifact: ArtifactEntry, session: SessionState): boolean {
  if (artifact.sessionId && artifact.sessionId === session.id) return true;

  // Legacy fallback: when sessionId is absent, feature sometimes mirrors branch naming.
  if (!artifact.sessionId) {
    const artifactFeature = normalize(artifact.feature);
    const sessionBranch = normalize(session.branch);
    if (artifactFeature.length > 0 && artifactFeature === sessionBranch) return true;

    const artifactTitle = normalize(artifact.title);
    const sessionId = normalize(session.id);
    if (sessionId.length > 0 && artifactTitle.includes(sessionId)) return true;
  }

  return false;
}

export function getSkippedPhases(session: SessionState): string[] {
  const explicit = session.taskClassification?.skippableStages;
  if (explicit && explicit.length > 0) return explicit;
  if (session.taskClassification?.fastTrack === true) return FAST_TRACK_DEFAULT_SKIP;
  return [];
}

function requiredArtifacts(session: SessionState): ArtifactType[] {
  const skipped = getSkippedPhases(session);
  return REQUIRED_DEFAULT.filter((p) => !skipped.includes(p));
}

export function getRequiredArtifacts(session: SessionState): ArtifactType[] {
  return requiredArtifacts(session);
}

export function getMissingRequiredArtifacts(
  session: SessionState,
  artifacts: ArtifactEntry[],
): ArtifactType[] {
  const required = requiredArtifacts(session);
  const relevant = artifacts.filter((artifact) => artifactBelongsToSession(artifact, session));
  const present = new Set<ArtifactType>(relevant.map((artifact) => artifact.type));
  return required.filter((artifactType) => !present.has(artifactType));
}

export function deriveWorkflowCompliance(
  session: SessionState,
  artifacts: ArtifactEntry[],
): WorkflowCompliance {
  const required = requiredArtifacts(session);
  const fastTrack = session.taskClassification?.fastTrack === true;
  const skippedRaw = getSkippedPhases(session);
  const skipped = REQUIRED_DEFAULT.filter((p) => skippedRaw.includes(p));

  const relevant = artifacts.filter((artifact) => artifactBelongsToSession(artifact, session));
  const lifecycleProgress = computeLifecycleProgress(session, relevant);

  // Active sessions are still in-flight; only completed sessions are scored as non-compliant.
  if (!session.endedAt) {
    return {
      status: 'compliant',
      required,
      missing: [],
      skipped,
      fastTrack,
      lifecycleProgress,
    };
  }

  const missing = getMissingRequiredArtifacts(session, artifacts);

  return {
    status: missing.length === 0 ? 'compliant' : 'non-compliant',
    required,
    missing,
    skipped,
    fastTrack,
    lifecycleProgress,
  };
}

export function deriveWorkflowComplianceMap(
  sessions: SessionState[],
  artifacts: ArtifactEntry[],
): Record<string, WorkflowCompliance> {
  const map: Record<string, WorkflowCompliance> = {};
  for (const session of sessions) {
    map[session.id] = deriveWorkflowCompliance(session, artifacts);
  }
  return map;
}
