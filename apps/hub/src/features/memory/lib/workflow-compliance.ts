import type { ArtifactEntry, ArtifactType, SessionState } from '../../../lib/types';

export type WorkflowComplianceStatus = 'compliant' | 'non-compliant';

export interface WorkflowCompliance {
  status: WorkflowComplianceStatus;
  required: ArtifactType[];
  missing: ArtifactType[];
  fastTrack: boolean;
}

const REQUIRED_DEFAULT: ArtifactType[] = ['brainstorm', 'plan', 'checklist', 'retro'];
const REQUIRED_FAST_TRACK: ArtifactType[] = ['plan', 'checklist', 'retro'];

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

function requiredArtifacts(session: SessionState): ArtifactType[] {
  return session.taskClassification?.fastTrack === true
    ? REQUIRED_FAST_TRACK
    : REQUIRED_DEFAULT;
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

  // Active sessions are still in-flight; only completed sessions are scored as non-compliant.
  if (!session.endedAt) {
    return {
      status: 'compliant',
      required,
      missing: [],
      fastTrack,
    };
  }

  const missing = getMissingRequiredArtifacts(session, artifacts);

  return {
    status: missing.length === 0 ? 'compliant' : 'non-compliant',
    required,
    missing,
    fastTrack,
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
