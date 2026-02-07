export type AiddPhase =
  | 'UNDERSTAND'
  | 'PLAN'
  | 'SPEC'
  | 'BUILD'
  | 'VERIFY'
  | 'SHIP';

export const AIDD_PHASES: AiddPhase[] = [
  'UNDERSTAND',
  'PLAN',
  'SPEC',
  'BUILD',
  'VERIFY',
  'SHIP',
];

export interface PhaseDefinition {
  name: AiddPhase;
  description: string;
  entryCriteria: string[];
  exitCriteria: string[];
  keyActivities: string[];
}

export const PHASE_DEFINITIONS: PhaseDefinition[] = [
  {
    name: 'UNDERSTAND',
    description: 'Active comprehension — load context, gather requirements, define acceptance criteria',
    entryCriteria: ['New feature request, task assignment, or bug report'],
    exitCriteria: ['Project context loaded', 'Requirements clear', 'Acceptance criteria defined (Given/When/Then)', 'Edge cases identified'],
    keyActivities: ['Load session history and branch context', 'Query memory for similar work', 'Analyze codebase: structure, patterns, dependencies', 'Define acceptance criteria', 'Identify edge cases and constraints'],
  },
  {
    name: 'PLAN',
    description: 'Task decomposition with tier assignments, issue tracking, and architecture decisions',
    entryCriteria: ['Requirements understood and approved'],
    exitCriteria: ['Task list created with file paths', 'Complexity and tier assigned per task', 'Dependencies ordered', 'User approved plan'],
    keyActivities: ['Break into atomic tasks', 'Map files to create/modify', 'Assign complexity and model tier per task', 'Check for reusable features', 'Create issue document if tracking a bug'],
  },
  {
    name: 'SPEC',
    description: 'Persist specification as a versioned artifact before implementation',
    entryCriteria: ['Plan approved by user'],
    exitCriteria: ['Spec committed: docs(scope): add spec for [feature]', 'Branch created if needed'],
    keyActivities: ['Check branch — suggest feature/<name> or fix/<name> if on main', 'Write spec document in docs/plans/active/', 'Commit spec separately from implementation'],
  },
  {
    name: 'BUILD',
    description: 'Implement the feature following the plan with per-task model dispatch',
    entryCriteria: ['Spec committed'],
    exitCriteria: ['All planned tasks completed', 'Code compiles', 'No type errors'],
    keyActivities: ['Follow plan strictly', 'Mark tasks in_progress/completed', 'Dispatch per-task model tier', 'If divergence: update spec first', 'Run targeted tests after each change'],
  },
  {
    name: 'VERIFY',
    description: 'Single verification pass — tests, typecheck, lint, dead code review, spec alignment',
    entryCriteria: ['Implementation complete'],
    exitCriteria: ['Tests written for acceptance criteria', 'All tests passing', 'TypeScript clean', 'Linter clean', 'No dead code', 'Spec matches implementation'],
    keyActivities: ['Write/update tests matching acceptance criteria', 'Run typecheck', 'Run linter', 'Run test suite', 'Review for dead code and magic strings', 'Confirm spec matches final implementation'],
  },
  {
    name: 'SHIP',
    description: 'Implementation commit, memory updates, plan archival, and PR creation',
    entryCriteria: ['All verification passing'],
    exitCriteria: ['Implementation committed: feat/fix(scope): description', 'Memory updated if needed'],
    keyActivities: ['Run full check suite: typecheck + lint + test + build', 'Commit with conventional format', 'Update memory if significant decisions were made', 'Move spec to docs/plans/done/ if complete', 'Ask user: create PR, merge, or leave on branch'],
  },
];

export interface LifecyclePhaseRecord {
  name: AiddPhase;
  enteredAt: string;
  exitedAt?: string;
  notes?: string;
}

export interface LifecycleSession {
  id: string;
  sessionId?: string;
  feature: string;
  currentPhase: AiddPhase;
  status: 'active' | 'completed' | 'abandoned';
  phases: LifecyclePhaseRecord[];
  createdAt: string;
  updatedAt: string;
}
