import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { SqliteBackend } from '../sqlite-backend.js';
import type { StorageConfig } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cleanups: Array<{ backend?: SqliteBackend; dir: string }> = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'aidd-crud-test-'));
  cleanups.push({ dir });
  return dir;
}

function makeConfig(dir: string): StorageConfig {
  return { projectRoot: dir, aiddDir: dir, memoryDir: join(dir, 'memory') };
}

/** Track backend for cleanup. Must be called after makeTempDir + initialize. */
function trackBackend(backend: SqliteBackend): void {
  cleanups[cleanups.length - 1]!.backend = backend;
}

function makeSession(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    branch: 'main',
    startedAt: new Date().toISOString(),
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
    ...overrides,
  };
}

function makeObservation(id: string, sessionId: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    sessionId,
    type: 'decision' as const,
    title: `Observation ${id}`,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const now = () => new Date().toISOString();

function makeArtifact(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    type: 'brainstorm' as const,
    feature: 'test',
    title: `Artifact ${id}`,
    description: '',
    content: 'test content',
    status: 'active' as const,
    date: Date.now(),
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

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
// Session CRUD
// ---------------------------------------------------------------------------

describe('SqliteBackend — Session CRUD', () => {
  let backend: SqliteBackend;

  beforeEach(async () => {
    const dir = makeTempDir();
    backend = new SqliteBackend(makeConfig(dir));
    await backend.initialize();
    trackBackend(backend);
  });

  it('saves and retrieves a session', async () => {
    const session = makeSession('sess-1');
    await backend.saveSession(session);

    const retrieved = await backend.getSession('sess-1');
    expect(retrieved).toBeTruthy();
    expect(retrieved!.id).toBe('sess-1');
    expect(retrieved!.branch).toBe('main');
    expect(retrieved!.aiProvider.provider).toBe('anthropic');
  });

  it('returns null for non-existent session', async () => {
    const result = await backend.getSession('non-existent');
    expect(result).toBeNull();
  });

  it('updates a session by re-saving', async () => {
    const session = makeSession('sess-2');
    await backend.saveSession(session);

    const updated = makeSession('sess-2', {
      decisions: [{ decision: 'Use SQLite', reasoning: 'Simple', timestamp: new Date().toISOString() }],
      filesModified: ['src/index.ts'],
    });
    await backend.saveSession(updated);

    const retrieved = await backend.getSession('sess-2');
    expect(retrieved!.decisions).toHaveLength(1);
    expect(retrieved!.decisions[0]!.decision).toBe('Use SQLite');
    expect(retrieved!.filesModified).toContain('src/index.ts');
  });

  it('deletes a session', async () => {
    await backend.saveSession(makeSession('sess-3'));
    expect(await backend.getSession('sess-3')).toBeTruthy();

    await backend.deleteSession('sess-3');
    expect(await backend.getSession('sess-3')).toBeNull();
  });

  it('lists sessions with filter', async () => {
    await backend.saveSession(makeSession('sess-a', { branch: 'main' }));
    await backend.saveSession(makeSession('sess-b', { branch: 'feature/x' }));
    await backend.saveSession(makeSession('sess-c', { branch: 'main', endedAt: new Date().toISOString() }));

    const all = await backend.listSessions({});
    expect(all.length).toBe(3);

    const completed = await backend.listSessions({ status: 'completed' });
    expect(completed.length).toBe(1);

    const active = await backend.listSessions({ status: 'active' });
    expect(active.length).toBe(2);

    const limited = await backend.listSessions({ limit: 1 });
    expect(limited.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Observation CRUD
// ---------------------------------------------------------------------------

describe('SqliteBackend — Observation CRUD', () => {
  let backend: SqliteBackend;

  beforeEach(async () => {
    const dir = makeTempDir();
    backend = new SqliteBackend(makeConfig(dir));
    await backend.initialize();
    trackBackend(backend);
    await backend.saveSession(makeSession('parent-sess'));
  });

  it('saves and retrieves an observation', async () => {
    const obs = makeObservation('obs-1', 'parent-sess', {
      title: 'Use PostgreSQL for persistence',
      narrative: 'PostgreSQL chosen for reliability and JSON support.',
    });
    await backend.saveObservation(obs);

    const retrieved = await backend.getObservation('obs-1');
    expect(retrieved).toBeTruthy();
    expect(retrieved!.title).toBe('Use PostgreSQL for persistence');
    expect(retrieved!.narrative).toContain('PostgreSQL');
  });

  it('returns null for non-existent observation', async () => {
    expect(await backend.getObservation('non-existent')).toBeNull();
  });

  it('lists observations by sessionId', async () => {
    await backend.saveObservation(makeObservation('obs-a', 'parent-sess'));
    await backend.saveObservation(makeObservation('obs-b', 'parent-sess'));

    const list = await backend.listObservations({ sessionId: 'parent-sess' });
    expect(list.length).toBe(2);
  });

  it('lists observations with limit', async () => {
    for (let i = 0; i < 5; i++) {
      await backend.saveObservation(makeObservation(`obs-${i}`, 'parent-sess'));
    }

    const limited = await backend.listObservations({ limit: 3 });
    expect(limited.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Permanent Memory CRUD
// ---------------------------------------------------------------------------

describe('SqliteBackend — Permanent Memory CRUD', () => {
  let backend: SqliteBackend;

  beforeEach(async () => {
    const dir = makeTempDir();
    backend = new SqliteBackend(makeConfig(dir));
    await backend.initialize();
    trackBackend(backend);
  });

  it('saves and retrieves a decision', async () => {
    await backend.savePermanentMemory({
      id: 'dec-1',
      type: 'decision',
      title: 'Use hexagonal architecture',
      content: JSON.stringify({
        decision: 'Use hexagonal architecture',
        reasoning: 'Separation of concerns',
        alternatives: ['MVC', 'Clean Architecture'],
      }),
      createdAt: new Date().toISOString(),
    });

    const retrieved = await backend.getPermanentMemory('dec-1');
    expect(retrieved).toBeTruthy();
    expect(retrieved!.type).toBe('decision');
    expect(retrieved!.title).toBe('Use hexagonal architecture');
  });

  it('deletes permanent memory', async () => {
    await backend.savePermanentMemory({
      id: 'dec-2',
      type: 'mistake',
      title: 'Test error',
      content: JSON.stringify({ error: 'test', fix: 'fix' }),
      createdAt: new Date().toISOString(),
    });

    expect(await backend.getPermanentMemory('dec-2')).toBeTruthy();
    await backend.deletePermanentMemory('dec-2');
    expect(await backend.getPermanentMemory('dec-2')).toBeNull();
  });

  it('lists permanent memory by type', async () => {
    await backend.savePermanentMemory({
      id: 'pm-1', type: 'decision', title: 'Decision A',
      content: JSON.stringify({ decision: 'a', reasoning: 'b' }),
      createdAt: new Date().toISOString(),
    });
    await backend.savePermanentMemory({
      id: 'pm-2', type: 'convention', title: 'Convention C',
      content: JSON.stringify({ convention: 'c', example: 'd' }),
      createdAt: new Date().toISOString(),
    });

    const decisions = await backend.listPermanentMemory({ type: 'decision' });
    expect(decisions.length).toBe(1);

    const all = await backend.listPermanentMemory({});
    expect(all.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Artifact CRUD
// ---------------------------------------------------------------------------

describe('SqliteBackend — Artifact CRUD', () => {
  let backend: SqliteBackend;

  beforeEach(async () => {
    const dir = makeTempDir();
    backend = new SqliteBackend(makeConfig(dir));
    await backend.initialize();
    trackBackend(backend);
  });

  it('saves and retrieves an artifact', async () => {
    await backend.saveArtifact(makeArtifact('art-1', {
      type: 'brainstorm',
      feature: 'auth',
      title: 'Brainstorm: Auth',
      content: '## Ideas\n- OAuth\n- JWT',
      sessionId: 'sess-1',
    }));

    const retrieved = await backend.getArtifact('art-1');
    expect(retrieved).toBeTruthy();
    expect(retrieved!.title).toBe('Brainstorm: Auth');
    expect(retrieved!.type).toBe('brainstorm');
  });

  it('lists artifacts by type', async () => {
    await backend.saveArtifact(makeArtifact('art-a', {
      type: 'brainstorm', feature: 'a', title: 'A', content: 'x',
    }));
    await backend.saveArtifact(makeArtifact('art-b', {
      type: 'plan', feature: 'b', title: 'B', content: 'y',
    }));

    const brainstorms = await backend.listArtifacts({ type: 'brainstorm' });
    expect(brainstorms.length).toBe(1);

    const all = await backend.listArtifacts({});
    expect(all.length).toBe(2);
  });

  it('deletes an artifact', async () => {
    await backend.saveArtifact(makeArtifact('art-del', {
      type: 'plan', feature: 'x', title: 'X', content: 'z',
    }));

    expect(await backend.deleteArtifact('art-del')).toBe(true);
    expect(await backend.getArtifact('art-del')).toBeNull();
    expect(await backend.deleteArtifact('non-existent')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FTS5 Search
// ---------------------------------------------------------------------------

describe('SqliteBackend — FTS5 Search', () => {
  let backend: SqliteBackend;

  beforeEach(async () => {
    const dir = makeTempDir();
    backend = new SqliteBackend(makeConfig(dir));
    await backend.initialize();
    trackBackend(backend);
    await backend.saveSession(makeSession('search-sess'));
  });

  it('finds observations by keyword', async () => {
    await backend.saveObservation(makeObservation('obs-pg', 'search-sess', {
      title: 'Use PostgreSQL for persistence',
      narrative: 'PostgreSQL is reliable and supports JSONB natively.',
    }));
    await backend.saveObservation(makeObservation('obs-redis', 'search-sess', {
      title: 'Use Redis for caching',
      narrative: 'Redis provides sub-millisecond reads for hot data.',
    }));

    const results = await backend.search('PostgreSQL');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.title).toContain('PostgreSQL');
  });

  it('returns empty results for unmatched query', async () => {
    await backend.saveObservation(makeObservation('obs-x', 'search-sess', {
      title: 'Simple observation',
    }));

    const results = await backend.search('xyzzyfoobar');
    expect(results.length).toBe(0);
  });

  it('respects limit in search', async () => {
    for (let i = 0; i < 10; i++) {
      await backend.saveObservation(makeObservation(`obs-limit-${i}`, 'search-sess', {
        title: `Database decision number ${i}`,
        narrative: 'This is about database architecture patterns.',
      }));
    }

    const results = await backend.search('database', { limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('filters search by type', async () => {
    await backend.saveObservation(makeObservation('obs-dec', 'search-sess', {
      type: 'decision',
      title: 'Architecture decision about caching',
    }));
    await backend.saveObservation(makeObservation('obs-mis', 'search-sess', {
      type: 'mistake',
      title: 'Architecture mistake in caching',
    }));

    const decisions = await backend.search('architecture', { type: 'decision' });
    expect(decisions.every(r => r.type === 'decision')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Branch CRUD
// ---------------------------------------------------------------------------

describe('SqliteBackend — Branch CRUD', () => {
  let backend: SqliteBackend;

  beforeEach(async () => {
    const dir = makeTempDir();
    backend = new SqliteBackend(makeConfig(dir));
    await backend.initialize();
    trackBackend(backend);
  });

  it('saves and retrieves a branch context', async () => {
    await backend.saveBranch({
      branch: 'feature/auth',
      feature: 'User authentication',
      completedTasks: ['Design schema'],
      pendingTasks: ['Implement login'],
      decisions: [],
      errorsEncountered: [],
      filesModified: ['src/auth.ts'],
      sessionsCount: 1,
      totalDurationMs: 5000,
      updatedAt: new Date().toISOString(),
    });

    const retrieved = await backend.getBranch('feature/auth');
    expect(retrieved).toBeTruthy();
    expect(retrieved!.feature).toBe('User authentication');
    expect(retrieved!.pendingTasks).toContain('Implement login');
  });

  it('returns null for non-existent branch', async () => {
    expect(await backend.getBranch('non-existent')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Health Snapshots
// ---------------------------------------------------------------------------

describe('SqliteBackend — Health Snapshots', () => {
  let backend: SqliteBackend;

  beforeEach(async () => {
    const dir = makeTempDir();
    backend = new SqliteBackend(makeConfig(dir));
    await backend.initialize();
    trackBackend(backend);
  });

  it('saves and lists health snapshots', async () => {
    await backend.saveHealthSnapshot({
      id: 'hs-1',
      timestamp: now(),
      overall: 76,
      sessionSuccess: 84,
      complianceAvg: 78,
      errorRecurrence: 88,
      modelConsistency: 83,
      memoryUtilization: 35,
      sessionsAnalyzed: 34,
      sessionId: 'test-session-1',
    });

    const snapshots = await backend.listHealthSnapshots({});
    expect(snapshots.length).toBe(1);
    expect(snapshots[0]!.overall).toBe(76);
    expect(snapshots[0]!.sessionId).toBe('test-session-1');
  });
});

// ---------------------------------------------------------------------------
// System Diagnostics
// ---------------------------------------------------------------------------

describe('SqliteBackend — System Diagnostics', () => {
  it('returns diagnostics on fresh DB', async () => {
    const dir = makeTempDir();
    const backend = new SqliteBackend(makeConfig(dir));
    await backend.initialize();
    trackBackend(backend);

    const diag = await backend.getSystemDiagnostics();
    expect(diag.schemaVersion).toBeGreaterThanOrEqual(4);
    expect(diag.tableCounts).toBeTruthy();
    expect(diag.tableCounts.sessions).toBe(0);
    expect(diag.dbSizeBytes).toBeGreaterThan(0);
  });
});
