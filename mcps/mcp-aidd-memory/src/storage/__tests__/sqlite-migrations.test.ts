import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from '../migrations.js';
import { SqliteBackend } from '../sqlite-backend.js';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'aidd-migration-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('sqlite migrations', () => {
  it('upgrades legacy database and creates required artifacts table/indexes', async () => {
    const dir = makeTempDir();
    const dbPath = join(dir, 'data.db');
    const db = new Database(dbPath);

    db.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        memory_session_id TEXT,
        parent_session_id TEXT,
        branch TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        model_id TEXT,
        data TEXT NOT NULL
      );
      INSERT INTO meta (key, value) VALUES ('schema_hash', 'legacy');
    `);
    db.close();

    const backend = new SqliteBackend({
      projectRoot: dir,
      aiddDir: dir,
      memoryDir: join(dir, 'memory'),
    });
    await backend.initialize();
    await backend.close();

    const verifyDb = new Database(dbPath, { readonly: true });
    const artifactsTable = verifyDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='artifacts'")
      .get();
    const compositeIdx = verifyDb
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_sessions_status_started_at'")
      .get();
    const schemaVersion = verifyDb
      .prepare("SELECT value FROM meta WHERE key='schema_version'")
      .get() as { value: string } | undefined;
    verifyDb.close();

    expect(artifactsTable).toBeTruthy();
    expect(compositeIdx).toBeTruthy();
    expect(Number(schemaVersion?.value)).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('fails initialization when database version is newer than binary', async () => {
    const dir = makeTempDir();
    const dbPath = join(dir, 'data.db');
    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
      INSERT INTO meta (key, value) VALUES ('schema_version', '999');
    `);
    db.close();

    const backend = new SqliteBackend({
      projectRoot: dir,
      aiddDir: dir,
      memoryDir: join(dir, 'memory'),
    });

    try {
      await expect(backend.initialize()).rejects.toThrow(/newer than this binary/i);
    } finally {
      await backend.close();
    }
  });
});
