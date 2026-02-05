export type AsddPhase =
  | 'SYNC'
  | 'STORY'
  | 'PLAN'
  | 'COMMIT_SPEC'
  | 'EXECUTE'
  | 'TEST'
  | 'VERIFY'
  | 'COMMIT_IMPL';

export const ASDD_PHASES: AsddPhase[] = [
  'SYNC',
  'STORY',
  'PLAN',
  'COMMIT_SPEC',
  'EXECUTE',
  'TEST',
  'VERIFY',
  'COMMIT_IMPL',
];

export interface PhaseDefinition {
  name: AsddPhase;
  description: string;
  entryCriteria: string[];
  exitCriteria: string[];
  keyActivities: string[];
}

export const PHASE_DEFINITIONS: PhaseDefinition[] = [
  {
    name: 'SYNC',
    description: 'Synchronize context — load memory, branch state, and project configuration',
    entryCriteria: ['New feature request or task assignment'],
    exitCriteria: ['Project context loaded', 'Memory consulted', 'Branch state known'],
    keyActivities: ['Load session history', 'Check branch context', 'Query memory for similar work'],
  },
  {
    name: 'STORY',
    description: 'Define user story with acceptance criteria',
    entryCriteria: ['Context synchronized'],
    exitCriteria: ['User story written (As a / I want / So that)', 'Given/When/Then acceptance criteria defined'],
    keyActivities: ['Write user story', 'Define acceptance criteria', 'Identify edge cases'],
  },
  {
    name: 'PLAN',
    description: 'Create detailed implementation plan with atomic tasks',
    entryCriteria: ['User story approved'],
    exitCriteria: ['Task list created', 'Files to modify identified', 'Complexity per task estimated'],
    keyActivities: ['Break into atomic tasks', 'Map files to modify', 'Estimate complexity'],
  },
  {
    name: 'COMMIT_SPEC',
    description: 'Commit specification and plan before implementation',
    entryCriteria: ['Plan approved'],
    exitCriteria: ['Spec committed: docs(scope): add spec for [feature]'],
    keyActivities: ['Write spec document', 'Commit spec separately from implementation'],
  },
  {
    name: 'EXECUTE',
    description: 'Implement the feature following the plan',
    entryCriteria: ['Spec committed'],
    exitCriteria: ['All planned tasks completed', 'Code compiles', 'No type errors'],
    keyActivities: ['Follow plan strictly', 'Mark tasks in_progress/completed', 'Run targeted tests'],
  },
  {
    name: 'TEST',
    description: 'Write and run tests matching acceptance criteria',
    entryCriteria: ['Implementation complete'],
    exitCriteria: ['Tests written for acceptance criteria', 'All tests passing'],
    keyActivities: ['Write test cases', 'Run targeted tests', 'Fix failures'],
  },
  {
    name: 'VERIFY',
    description: 'Full verification — typecheck, lint, test suite',
    entryCriteria: ['Targeted tests passing'],
    exitCriteria: ['TypeScript clean', 'Linter clean', 'Full test suite passing'],
    keyActivities: ['Run typecheck', 'Run linter', 'Run full test suite'],
  },
  {
    name: 'COMMIT_IMPL',
    description: 'Commit implementation with proper format',
    entryCriteria: ['All verification passing'],
    exitCriteria: ['Implementation committed: feat/fix(scope): description'],
    keyActivities: ['Stage changes', 'Commit with conventional format', 'Verify commit'],
  },
];

export interface LifecyclePhaseRecord {
  name: AsddPhase;
  enteredAt: string;
  exitedAt?: string;
  notes?: string;
}

export interface LifecycleSession {
  id: string;
  sessionId?: string;
  feature: string;
  currentPhase: AsddPhase;
  status: 'active' | 'completed' | 'abandoned';
  phases: LifecyclePhaseRecord[];
  createdAt: string;
  updatedAt: string;
}
