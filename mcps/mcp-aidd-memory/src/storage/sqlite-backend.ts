import { resolve } from 'node:path';
import {
  ensureDir,
  readJsonFile,
  now,
} from '@aidd.md/mcp-shared';
import type {
  AnalyticsQuery,
  AnalyticsResult,
  MemoryEntry,
  MemoryIndexEntry,
  MemoryTimelineEntry,
  SearchOptions,
  SessionFilter,
  SessionObservation,
  SessionState,
  ToolUsageEntry,
} from '@aidd.md/mcp-shared';
import type { StorageBackend, StorageConfig } from './types.js';
import { SCHEMA_V1 } from './migrations.js';

type BetterSqlite3 = typeof import('better-sqlite3');
type Database = import('better-sqlite3').Database;

export class SqliteBackend implements StorageBackend {
  readonly name = 'sqlite';
  private db!: Database;
  private dbPath: string;

  constructor(private config: StorageConfig) {
    this.dbPath = resolve(config.aiddDir, 'data.db');
  }

  async initialize(): Promise<void> {
    ensureDir(this.config.aiddDir);

    const BetterSqlite3Module = (await import('better-sqlite3')) as { default: BetterSqlite3 };
    const Database = BetterSqlite3Module.default;
    this.db = new Database(this.dbPath);

    // Check if schema exists
    const hasSchema = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'",
    ).get();

    if (!hasSchema) {
      this.db.exec(SCHEMA_V1);
    }

    // Sync permanent memory into search index
    await this.syncPermanentMemory();
  }

  async close(): Promise<void> {
    this.db?.close();
  }

  // ---- Sessions ----

  async saveSession(session: SessionState): Promise<void> {
    const status = session.endedAt ? 'completed' : 'active';
    this.db.prepare(`
      INSERT OR REPLACE INTO sessions (id, memory_session_id, parent_session_id, branch, started_at, ended_at, status, data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      session.memorySessionId ?? null,
      session.parentSessionId ?? null,
      session.branch,
      session.startedAt,
      session.endedAt ?? null,
      status,
      JSON.stringify(session),
    );
  }

  async getSession(id: string): Promise<SessionState | null> {
    const row = this.db.prepare('SELECT data FROM sessions WHERE id = ?').get(id) as
      | { data: string }
      | undefined;
    return row ? (JSON.parse(row.data) as SessionState) : null;
  }

  async listSessions(filter?: SessionFilter): Promise<MemoryIndexEntry[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.branch) {
      conditions.push('branch = ?');
      params.push(filter.branch);
    }
    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    if (filter?.memorySessionId) {
      conditions.push('memory_session_id = ?');
      params.push(filter.memorySessionId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;

    const rows = this.db.prepare(
      `SELECT data FROM sessions ${where} ORDER BY started_at DESC LIMIT ? OFFSET ?`,
    ).all(...params, limit, offset) as Array<{ data: string }>;

    return rows.map((row) => {
      const session = JSON.parse(row.data) as SessionState;
      return {
        id: session.id,
        type: 'insight' as const,
        title: `Session ${session.id} (${session.branch})`,
        snippet: `${session.aiProvider.model} | ${session.decisions.length} decisions | ${session.filesModified.length} files`,
        createdAt: session.startedAt,
        sessionId: session.id,
      };
    });
  }

  // ---- Observations ----

  async saveObservation(observation: SessionObservation): Promise<void> {
    this.db.prepare(`
      INSERT OR REPLACE INTO observations (id, session_id, type, title, content, facts, concepts, files_read, files_modified, discovery_tokens, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      observation.id,
      observation.sessionId,
      observation.type,
      observation.title,
      observation.narrative ?? null,
      observation.facts ? JSON.stringify(observation.facts) : null,
      observation.concepts ? JSON.stringify(observation.concepts) : null,
      observation.filesRead ? JSON.stringify(observation.filesRead) : null,
      observation.filesModified ? JSON.stringify(observation.filesModified) : null,
      observation.discoveryTokens ?? null,
      observation.createdAt,
    );
  }

  async getObservation(id: string): Promise<SessionObservation | null> {
    const row = this.db.prepare('SELECT * FROM observations WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return this.rowToObservation(row);
  }

  // ---- Search (3-layer) ----

  async search(query: string, options?: SearchOptions): Promise<MemoryIndexEntry[]> {
    const ftsQuery = query
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .map((w) => `"${w}"`)
      .join(' OR ');

    if (!ftsQuery) return [];

    const results: MemoryIndexEntry[] = [];

    // Search observations via FTS5
    const obsConditions: string[] = [];
    const obsParams: unknown[] = [ftsQuery];

    if (options?.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type];
      obsConditions.push(`o.type IN (${types.map(() => '?').join(',')})`);
      obsParams.push(...types);
    }
    if (options?.sessionId) {
      obsConditions.push('o.session_id = ?');
      obsParams.push(options.sessionId);
    }
    if (options?.dateStart) {
      obsConditions.push('o.created_at >= ?');
      obsParams.push(options.dateStart);
    }
    if (options?.dateEnd) {
      obsConditions.push('o.created_at <= ?');
      obsParams.push(options.dateEnd);
    }

    const obsWhere = obsConditions.length > 0 ? `AND ${obsConditions.join(' AND ')}` : '';

    const obsRows = this.db.prepare(`
      SELECT o.id, o.type, o.title, o.content, o.created_at, o.session_id,
             bm25(observations_fts) as rank
      FROM observations_fts fts
      JOIN observations o ON o.rowid = fts.rowid
      WHERE observations_fts MATCH ?
      ${obsWhere}
      ORDER BY rank
      LIMIT 50
    `).all(...obsParams) as Array<Record<string, unknown>>;

    for (const row of obsRows) {
      results.push({
        id: String(row['id']),
        type: String(row['type']) as MemoryIndexEntry['type'],
        title: String(row['title']),
        snippet: String(row['content'] ?? '').slice(0, 100),
        createdAt: String(row['created_at']),
        sessionId: row['session_id'] ? String(row['session_id']) : undefined,
        relevanceScore: Math.min(1, Math.abs(Number(row['rank'] ?? 0)) / 10),
      });
    }

    // Search permanent memory via FTS5
    const pmConditions: string[] = [];
    const pmParams: unknown[] = [ftsQuery];

    if (options?.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type];
      pmConditions.push(`pm.type IN (${types.map(() => '?').join(',')})`);
      pmParams.push(...types);
    }

    const pmWhere = pmConditions.length > 0 ? `AND ${pmConditions.join(' AND ')}` : '';

    const pmRows = this.db.prepare(`
      SELECT pm.id, pm.type, pm.title, pm.content, pm.created_at, pm.session_id,
             bm25(permanent_memory_fts) as rank
      FROM permanent_memory_fts fts
      JOIN permanent_memory pm ON pm.rowid = fts.rowid
      WHERE permanent_memory_fts MATCH ?
      ${pmWhere}
      ORDER BY rank
      LIMIT 50
    `).all(...pmParams) as Array<Record<string, unknown>>;

    for (const row of pmRows) {
      results.push({
        id: String(row['id']),
        type: String(row['type']) as MemoryIndexEntry['type'],
        title: String(row['title']),
        snippet: String(row['content'] ?? '').slice(0, 100),
        createdAt: String(row['created_at']),
        sessionId: row['session_id'] ? String(row['session_id']) : undefined,
        relevanceScore: Math.min(1, Math.abs(Number(row['rank'] ?? 0)) / 10),
      });
    }

    // Sort
    const orderBy = options?.orderBy ?? 'relevance';
    if (orderBy === 'relevance') {
      results.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    } else if (orderBy === 'date_desc') {
      results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else {
      results.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;
    return results.slice(offset, offset + limit);
  }

  async getTimeline(anchorId: string, depth = 3): Promise<MemoryTimelineEntry> {
    const anchorObs = this.db.prepare('SELECT * FROM observations WHERE id = ?').get(anchorId) as
      | Record<string, unknown>
      | undefined;

    if (!anchorObs) {
      const pmRow = this.db.prepare('SELECT * FROM permanent_memory WHERE id = ?').get(anchorId) as
        | Record<string, unknown>
        | undefined;

      if (!pmRow) {
        return {
          anchor: { id: anchorId, type: 'insight', title: 'Not found', snippet: '', createdAt: now() },
          before: [],
          after: [],
        };
      }

      const anchor = this.pmRowToIndex(pmRow);
      return { anchor, before: [], after: [] };
    }

    const anchor = this.obsRowToIndex(anchorObs);
    const anchorDate = String(anchorObs['created_at']);

    const before = (
      this.db.prepare(
        'SELECT * FROM observations WHERE created_at < ? ORDER BY created_at DESC LIMIT ?',
      ).all(anchorDate, depth) as Array<Record<string, unknown>>
    ).map((r) => this.obsRowToIndex(r)).reverse();

    const after = (
      this.db.prepare(
        'SELECT * FROM observations WHERE created_at > ? ORDER BY created_at ASC LIMIT ?',
      ).all(anchorDate, depth) as Array<Record<string, unknown>>
    ).map((r) => this.obsRowToIndex(r));

    return { anchor, before, after };
  }

  async getByIds(ids: string[]): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = [];
    const placeholders = ids.map(() => '?').join(',');

    const obsRows = this.db.prepare(
      `SELECT * FROM observations WHERE id IN (${placeholders})`,
    ).all(...ids) as Array<Record<string, unknown>>;

    const foundIds = new Set<string>();
    for (const row of obsRows) {
      const id = String(row['id']);
      foundIds.add(id);
      results.push(this.obsRowToEntry(row));
    }

    const remaining = ids.filter((id) => !foundIds.has(id));
    if (remaining.length > 0) {
      const pmPlaceholders = remaining.map(() => '?').join(',');
      const pmRows = this.db.prepare(
        `SELECT * FROM permanent_memory WHERE id IN (${pmPlaceholders})`,
      ).all(...remaining) as Array<Record<string, unknown>>;

      for (const row of pmRows) {
        results.push({
          id: String(row['id']),
          type: String(row['type']) as MemoryEntry['type'],
          title: String(row['title']),
          content: String(row['content']),
          createdAt: String(row['created_at']),
          sessionId: row['session_id'] ? String(row['session_id']) : undefined,
        });
      }
    }

    return results;
  }

  // ---- Analytics ----

  async recordToolUsage(entry: ToolUsageEntry): Promise<void> {
    this.db.prepare(`
      INSERT INTO tool_usage (tool_name, session_id, result_quality, duration_ms, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(entry.toolName, entry.sessionId, entry.resultQuality, entry.durationMs ?? null, entry.timestamp);
  }

  async getAnalytics(query: AnalyticsQuery): Promise<AnalyticsResult> {
    if (query.metric === 'tool_usage') {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (query.dateStart) {
        conditions.push('timestamp >= ?');
        params.push(query.dateStart);
      }
      if (query.dateEnd) {
        conditions.push('timestamp <= ?');
        params.push(query.dateEnd);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limit = query.limit ?? 50;

      const rows = this.db.prepare(`
        SELECT tool_name as key, COUNT(*) as count
        FROM tool_usage ${where}
        GROUP BY tool_name
        ORDER BY count DESC
        LIMIT ?
      `).all(...params, limit) as Array<{ key: string; count: number }>;

      const totalRow = this.db.prepare(`SELECT COUNT(*) as total FROM tool_usage ${where}`).get(...params) as
        | { total: number }
        | undefined;

      return {
        metric: 'tool_usage',
        entries: rows,
        total: totalRow?.total ?? 0,
      };
    }

    return { metric: query.metric, entries: [], total: 0 };
  }

  // ---- Permanent memory sync ----

  private async syncPermanentMemory(): Promise<void> {
    const memDir = this.config.memoryDir;

    const syncFile = <T extends { id: string }>(
      filename: string,
      type: string,
      toTitle: (entry: T) => string,
      toContent: (entry: T) => string,
      toCreatedAt: (entry: T) => string,
      toSessionId: (entry: T) => string | null,
    ) => {
      const entries = readJsonFile<T[]>(resolve(memDir, filename));
      if (!entries) return;

      const upsert = this.db.prepare(`
        INSERT OR REPLACE INTO permanent_memory (id, type, title, content, created_at, session_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const transaction = this.db.transaction(() => {
        for (const entry of entries) {
          upsert.run(
            entry.id,
            type,
            toTitle(entry),
            toContent(entry),
            toCreatedAt(entry),
            toSessionId(entry),
          );
        }
      });

      transaction();
    };

    type DecisionEntry = {
      id: string; decision: string; reasoning: string;
      alternatives?: string[]; context?: string;
      createdAt: string; sessionId?: string;
    };
    syncFile<DecisionEntry>(
      'decisions.json', 'decision',
      (d) => d.decision,
      (d) => `${d.reasoning}${d.context ? `\nContext: ${d.context}` : ''}`,
      (d) => d.createdAt,
      (d) => d.sessionId ?? null,
    );

    type MistakeEntry = {
      id: string; error: string; rootCause: string; fix: string;
      prevention: string; occurrences: number;
      createdAt: string; lastSeenAt: string; sessionId?: string;
    };
    syncFile<MistakeEntry>(
      'mistakes.json', 'mistake',
      (m) => m.error,
      (m) => `Root cause: ${m.rootCause}\nFix: ${m.fix}\nPrevention: ${m.prevention}`,
      (m) => m.createdAt,
      (m) => m.sessionId ?? null,
    );

    type ConventionEntry = {
      id: string; convention: string; example: string;
      rationale?: string; createdAt: string; sessionId?: string;
    };
    syncFile<ConventionEntry>(
      'conventions.json', 'convention',
      (c) => c.convention,
      (c) => `Example: ${c.example}${c.rationale ? `\nRationale: ${c.rationale}` : ''}`,
      (c) => c.createdAt,
      (c) => c.sessionId ?? null,
    );
  }

  // ---- Row mappers ----

  private rowToObservation(row: Record<string, unknown>): SessionObservation {
    return {
      id: String(row['id']),
      sessionId: String(row['session_id']),
      type: String(row['type']) as SessionObservation['type'],
      title: String(row['title']),
      narrative: row['content'] ? String(row['content']) : undefined,
      facts: row['facts'] ? (JSON.parse(String(row['facts'])) as string[]) : undefined,
      concepts: row['concepts'] ? (JSON.parse(String(row['concepts'])) as string[]) : undefined,
      filesRead: row['files_read'] ? (JSON.parse(String(row['files_read'])) as string[]) : undefined,
      filesModified: row['files_modified'] ? (JSON.parse(String(row['files_modified'])) as string[]) : undefined,
      discoveryTokens: row['discovery_tokens'] ? Number(row['discovery_tokens']) : undefined,
      createdAt: String(row['created_at']),
    };
  }

  private obsRowToIndex(row: Record<string, unknown>): MemoryIndexEntry {
    return {
      id: String(row['id']),
      type: String(row['type']) as MemoryIndexEntry['type'],
      title: String(row['title']),
      snippet: String(row['content'] ?? '').slice(0, 100),
      createdAt: String(row['created_at']),
      sessionId: row['session_id'] ? String(row['session_id']) : undefined,
    };
  }

  private pmRowToIndex(row: Record<string, unknown>): MemoryIndexEntry {
    return {
      id: String(row['id']),
      type: String(row['type']) as MemoryIndexEntry['type'],
      title: String(row['title']),
      snippet: String(row['content'] ?? '').slice(0, 100),
      createdAt: String(row['created_at']),
      sessionId: row['session_id'] ? String(row['session_id']) : undefined,
    };
  }

  private obsRowToEntry(row: Record<string, unknown>): MemoryEntry {
    return {
      id: String(row['id']),
      type: String(row['type']) as MemoryEntry['type'],
      title: String(row['title']),
      content: String(row['content'] ?? ''),
      facts: row['facts'] ? (JSON.parse(String(row['facts'])) as string[]) : undefined,
      concepts: row['concepts'] ? (JSON.parse(String(row['concepts'])) as string[]) : undefined,
      filesRead: row['files_read'] ? (JSON.parse(String(row['files_read'])) as string[]) : undefined,
      filesModified: row['files_modified'] ? (JSON.parse(String(row['files_modified'])) as string[]) : undefined,
      discoveryTokens: row['discovery_tokens'] ? Number(row['discovery_tokens']) : undefined,
      createdAt: String(row['created_at']),
      sessionId: row['session_id'] ? String(row['session_id']) : undefined,
    };
  }
}
