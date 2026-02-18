import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { SqliteBackend } from '../../../storage/sqlite-backend.js';
import type { StorageConfig } from '../../../storage/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cleanups: Array<{ backend?: SqliteBackend; dir: string }> = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'aidd-session-test-'));
  cleanups.push({ dir });
  return dir;
}

function makeConfig(dir: string): StorageConfig {
  return { projectRoot: dir, aiddDir: dir, memoryDir: join(dir, 'memory') };
}

const BASE_SESSION = {
  branch: 'main',
  aiProvider: { provider: 'anthropic', model: 'opus', modelId: 'claude-opus-4-6', client: 'test' },
  decisions: [],
  errorsResolved: [],
  filesModified: [],
  tasksCompleted: [],
  tasksPending: [],
  agentsUsed: [],
  skillsUsed: [],
  toolsCalled: [],
  rulesApplied: [],
  workflowsFollowed: [],
  tkbEntriesConsulted: [],
  taskClassification: { domain: 'backend', nature: 'analysis', complexity: 'moderate' },
};

afterEach(async () => {
  while (cleanups.length > 0) {
    const entry = cleanups.pop();
    if (entry) {
      if (entry.backend) await entry.backend.close();
      rmSync(entry.dir, { recursive: true, force: true });
    }
  }
});

// ---------------------------------------------------------------------------
// Session State Machine
// ---------------------------------------------------------------------------

describe('Session State Machine', () => {
  let backend: SqliteBackend;

  beforeEach(async () => {
    const dir = makeTempDir();
    backend = new SqliteBackend(makeConfig(dir));
    await backend.initialize();
    cleanups[cleanups.length - 1]!.backend = backend;
  });

  it('creates a session with initial empty arrays', async () => {
    const session = {
      id: 'sm-1',
      startedAt: new Date().toISOString(),
      ...BASE_SESSION,
    };
    await backend.saveSession(session);

    const retrieved = await backend.getSession('sm-1');
    expect(retrieved).toBeTruthy();
    expect(retrieved!.decisions).toHaveLength(0);
    expect(retrieved!.filesModified).toHaveLength(0);
    expect(retrieved!.endedAt).toBeUndefined();
  });

  it('transitions from active to completed via endedAt', async () => {
    const session = { id: 'sm-2', startedAt: new Date().toISOString(), ...BASE_SESSION };
    await backend.saveSession(session);

    // Verify active
    const active = await backend.listSessions({ status: 'active' });
    expect(active.some(s => s.id === 'sm-2')).toBe(true);

    // End session
    const ended = { ...session, endedAt: new Date().toISOString() };
    await backend.saveSession(ended);

    // Verify completed
    const completed = await backend.listSessions({ status: 'completed' });
    expect(completed.some(s => s.id === 'sm-2')).toBe(true);

    const stillActive = await backend.listSessions({ status: 'active' });
    expect(stillActive.some(s => s.id === 'sm-2')).toBe(false);
  });

  it('appends decisions via re-save', async () => {
    const session = { id: 'sm-3', startedAt: new Date().toISOString(), ...BASE_SESSION };
    await backend.saveSession(session);

    // Add decision
    const withDecision = {
      ...session,
      decisions: [
        { decision: 'Use SQLite', reasoning: 'Embedded, no server', timestamp: new Date().toISOString() },
      ],
    };
    await backend.saveSession(withDecision);

    const retrieved = await backend.getSession('sm-3');
    expect(retrieved!.decisions).toHaveLength(1);
    expect(retrieved!.decisions[0]!.decision).toBe('Use SQLite');
  });

  it('stores token usage', async () => {
    const session = {
      id: 'sm-4',
      startedAt: new Date().toISOString(),
      ...BASE_SESSION,
      tokenUsage: { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 200 },
    };
    await backend.saveSession(session);

    const retrieved = await backend.getSession('sm-4');
    expect(retrieved!.tokenUsage).toBeTruthy();
    expect(retrieved!.tokenUsage!.inputTokens).toBe(1000);
    expect(retrieved!.tokenUsage!.outputTokens).toBe(500);
  });

  it('stores timing metrics', async () => {
    const session = {
      id: 'sm-5',
      startedAt: new Date().toISOString(),
      ...BASE_SESSION,
      timingMetrics: { startupMs: 42, governanceOverheadMs: 100 },
    };
    await backend.saveSession(session);

    const retrieved = await backend.getSession('sm-5');
    expect(retrieved!.timingMetrics).toBeTruthy();
    expect(retrieved!.timingMetrics!.startupMs).toBe(42);
  });

  it('stores outcome on session end', async () => {
    const session = {
      id: 'sm-6',
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      ...BASE_SESSION,
      outcome: {
        testsPassing: true,
        complianceScore: 85,
        reverts: 0,
        reworks: 1,
        userFeedback: 'positive' as const,
      },
    };
    await backend.saveSession(session);

    const retrieved = await backend.getSession('sm-6');
    expect(retrieved!.outcome).toBeTruthy();
    expect(retrieved!.outcome!.complianceScore).toBe(85);
    expect(retrieved!.outcome!.userFeedback).toBe('positive');
  });

  it('stores task classification with fast-track fields', async () => {
    const session = {
      id: 'sm-7',
      startedAt: new Date().toISOString(),
      ...BASE_SESSION,
      taskClassification: {
        domain: 'frontend',
        nature: 'bugfix',
        complexity: 'trivial',
        fastTrack: true,
        skippableStages: ['brainstorm', 'plan', 'checklist'],
      },
    };
    await backend.saveSession(session);

    const retrieved = await backend.getSession('sm-7');
    expect(retrieved!.taskClassification.fastTrack).toBe(true);
    expect(retrieved!.taskClassification.skippableStages).toContain('brainstorm');
  });

  it('preserves session input and output strings', async () => {
    const session = {
      id: 'sm-8',
      startedAt: new Date().toISOString(),
      ...BASE_SESSION,
      input: 'Deep dive analysis of the project',
      output: 'Analysis complete with 3 sprints of improvements identified',
    };
    await backend.saveSession(session);

    const retrieved = await backend.getSession('sm-8');
    expect(retrieved!.input).toBe('Deep dive analysis of the project');
    expect(retrieved!.output).toContain('3 sprints');
  });

  it('handles multiple files in filesModified', async () => {
    const files = ['src/a.ts', 'src/b.ts', 'src/c.ts', 'package.json'];
    const session = {
      id: 'sm-9',
      startedAt: new Date().toISOString(),
      ...BASE_SESSION,
      filesModified: files,
    };
    await backend.saveSession(session);

    const retrieved = await backend.getSession('sm-9');
    expect(retrieved!.filesModified).toHaveLength(4);
    expect(retrieved!.filesModified).toContain('package.json');
  });
});
