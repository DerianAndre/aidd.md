import type { ArtifactEntry, SessionState } from '../../../lib/types';
import { getSkippedPhases } from './workflow-compliance';

// --- Types ---

export type PhaseStatus = 'completed' | 'active' | 'skipped' | 'pending';

export interface PhaseWeight {
  id: string;
  name: string;
  weight: number;
  artifactTypes: string[];
}

export interface PhaseProgress {
  id: string;
  name: string;
  status: PhaseStatus;
  weight: number;
  contribution: number;
}

export interface BonusMilestone {
  type: string;
  label: string;
  points: number;
  present: boolean;
}

export interface LifecycleProgress {
  phases: PhaseProgress[];
  milestones: BonusMilestone[];
  score: number;
  activePhaseId: string | null;
  isWip: boolean;
  isFastTrack: boolean;
}

// --- Constants ---

const INIT_BASELINE = 5;

const PHASE_WEIGHTS: PhaseWeight[] = [
  { id: 'brainstorm', name: 'Brainstorm', weight: 8, artifactTypes: ['brainstorm', 'research'] },
  { id: 'plan', name: 'Plan', weight: 8, artifactTypes: ['plan', 'adr', 'diagram', 'spec'] },
  { id: 'execute', name: 'Execute', weight: 14, artifactTypes: ['issue', 'spec'] },
  { id: 'test', name: 'Test', weight: 8, artifactTypes: ['checklist'] },
  { id: 'review', name: 'Review', weight: 7, artifactTypes: [] },
  { id: 'ship', name: 'Ship', weight: 5, artifactTypes: ['retro'] },
];

const MILESTONE_DEFS = [
  { type: 'adr', label: 'ADR', points: 15 },
  { type: 'checklist', label: 'Checklist', points: 10 },
  { type: 'retro', label: 'Retro', points: 20 },
] as const;

// --- Phase completion detection (mirrors PhaseStepper logic) ---

function detectCompletedPhases(
  session: SessionState,
  artifacts: ArtifactEntry[],
): Set<string> {
  const completed = new Set<string>();
  const artifactTypes = new Set(artifacts.map((a) => a.type as string));

  for (const phase of PHASE_WEIGHTS) {
    if (phase.artifactTypes.some((t) => artifactTypes.has(t))) {
      completed.add(phase.id);
    }
  }

  // Execute: also completed if files modified or tasks completed
  const hasExecutionSignal =
    (session.filesModified?.length ?? 0) > 0 ||
    (session.tasksCompleted?.length ?? 0) > 0;
  if (hasExecutionSignal) {
    completed.add('execute');
  }

  // Review: completed when session has ended
  if (session.endedAt) {
    completed.add('review');
  }

  return completed;
}

// --- Bonus milestones ---

export function computeBonusMilestones(artifacts: ArtifactEntry[]): BonusMilestone[] {
  const artifactTypes = new Set(artifacts.map((a) => a.type as string));
  return MILESTONE_DEFS.map((def) => ({
    type: def.type,
    label: def.label,
    points: def.points,
    present: artifactTypes.has(def.type),
  }));
}

// --- Main algorithm ---

export function computeLifecycleProgress(
  session: SessionState,
  artifacts: ArtifactEntry[],
): LifecycleProgress {
  const isActive = !session.endedAt;
  const isFastTrack = session.taskClassification?.fastTrack === true;
  const skippedPhases = getSkippedPhases(session);
  const completedPhases = detectCompletedPhases(session, artifacts);

  // Compute redistributed weights for skipped phases
  let redistributedToExecute = 0;
  for (const phase of PHASE_WEIGHTS) {
    if (skippedPhases.includes(phase.id) && phase.id !== 'execute') {
      redistributedToExecute += phase.weight;
    }
  }

  // Build phase progress entries
  let activePhaseId: string | null = null;
  const phases: PhaseProgress[] = PHASE_WEIGHTS.map((phase) => {
    const isCompleted = completedPhases.has(phase.id);
    const isSkipped = skippedPhases.includes(phase.id);

    // Effective weight after redistribution
    let effectiveWeight = isSkipped ? 0 : phase.weight;
    if (phase.id === 'execute') {
      effectiveWeight += redistributedToExecute;
    }

    // Determine status
    let status: PhaseStatus;
    if (isCompleted) {
      status = 'completed';
    } else if (isSkipped) {
      status = 'skipped';
    } else if (isActive && activePhaseId === null) {
      status = 'active';
      activePhaseId = phase.id;
    } else {
      status = 'pending';
    }

    const contribution = status === 'completed' ? effectiveWeight : 0;

    return { id: phase.id, name: phase.name, status, weight: effectiveWeight, contribution };
  });

  // Milestones
  const milestones = computeBonusMilestones(artifacts);
  const milestoneScore = milestones
    .filter((m) => m.present)
    .reduce((sum, m) => sum + m.points, 0);

  // Total score
  const phaseScore = phases.reduce((sum, p) => sum + p.contribution, 0);
  const score = Math.min(100, Math.max(0, INIT_BASELINE + phaseScore + milestoneScore));

  return {
    phases,
    milestones,
    score,
    activePhaseId,
    isWip: isActive && activePhaseId !== null,
    isFastTrack,
  };
}

// --- Color helpers ---

export function getLifecycleColor(score: number, isWip: boolean): string {
  if (isWip) return 'text-amber-500';
  if (score >= 70) return 'text-teal-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-muted-foreground';
}

export function getLifecycleStrokeColor(score: number, isWip: boolean): string {
  if (isWip) return 'stroke-amber-500';
  if (score >= 70) return 'stroke-teal-500';
  if (score >= 40) return 'stroke-amber-500';
  return 'stroke-muted-foreground';
}
