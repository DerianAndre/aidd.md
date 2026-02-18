import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

const tempDirs: string[] = [];
const repoRoot = resolve(import.meta.dirname, '../../../../');
const planEnterHook = join(repoRoot, 'scripts', 'hooks', 'on-plan-enter.cjs');

function makeTempProjectDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'aidd-hook-test-'));
  tempDirs.push(dir);
  mkdirSync(join(dir, '.aidd'));
  return dir;
}

function seedHookDatabase(projectDir: string, sessionData: object): void {
  const dbPath = join(projectDir, '.aidd', 'data.db');
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE artifacts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  db.prepare(
    'INSERT INTO sessions (id, status, started_at, data) VALUES (?, ?, ?, ?)',
  ).run(
    'session-1',
    'active',
    '2026-02-09T00:00:00.000Z',
    JSON.stringify(sessionData),
  );
  db.close();
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('on-plan-enter hook fast-track policy', () => {
  it('skips brainstorm warning when persisted fastTrack=true', () => {
    const projectDir = makeTempProjectDir();
    seedHookDatabase(projectDir, {
      taskClassification: { complexity: 'low', fastTrack: true },
    });

    const output = execFileSync(process.execPath, [planEnterHook], {
      cwd: projectDir,
      encoding: 'utf8',
    });

    expect(output).toContain('skipped (fast-track)');
    expect(output).not.toContain('No brainstorm artifact found');
  });

  it('enforces brainstorm warning when fastTrack is not set', () => {
    const projectDir = makeTempProjectDir();
    seedHookDatabase(projectDir, {
      taskClassification: { complexity: 'low' },
    });

    const output = execFileSync(process.execPath, [planEnterHook], {
      cwd: projectDir,
      encoding: 'utf8',
    });

    expect(output).toContain('No brainstorm artifact found');
    expect(output).not.toContain('skipped (fast-track)');
  });
});
