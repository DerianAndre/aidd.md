import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import {
  ensureDir,
  now,
} from '@aidd.md/mcp-shared';
import type {
  AnalyticsQuery,
  AnalyticsResult,
  AuditScore,
  BannedPattern,
  BannedPatternFilter,
  BranchContext,
  DraftEntry,
  DraftFilter,
  EvolutionCandidate,
  EvolutionCandidateFilter,
  EvolutionLogEntry,
  EvolutionLogFilter,
  EvolutionSnapshot,
  LifecycleFilter,
  LifecycleSession,
  MemoryEntry,
  MemoryIndexEntry,
  MemoryTimelineEntry,
  PatternDetection,
  PatternStats,
  PatternStatsFilter,
  PermanentMemoryEntry,
  PermanentMemoryFilter,
  PruneOptions,
  SearchOptions,
  SessionFilter,
  SessionObservation,
  SessionState,
  StorageBackend,
  ToolUsageEntry,
} from '@aidd.md/mcp-shared';
import type { StorageConfig } from './types.js';
import { SCHEMA } from './migrations.js';

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

    // Check if schema exists via meta table
    const hasMeta = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='meta'",
    ).get();

    if (!hasMeta) {
      this.db.exec(SCHEMA);
    }

    // Schema checksum verification (R1)
    const currentHash = createHash('sha256').update(SCHEMA).digest('hex').slice(0, 16);
    const stored = this.db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_hash') as
      | { value: string }
      | undefined;
    if (stored && stored.value !== currentHash) {
      console.warn('[aidd] Schema Mismatch — DB schema has changed since last run');
    }
    this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('schema_hash', currentHash);
  }

  async close(): Promise<void> {
    this.db?.close();
  }

  // ---- Lifecycle (R2, R3) ----

  checkpoint(): void {
    this.db.pragma('wal_checkpoint(TRUNCATE)');
  }

  pruneStaleData(options?: PruneOptions): void {
    const {
      patternDetectionMaxAgeDays = 30,
      maxObservations = 1000,
      maxSessionsIndexed = 50,
    } = options ?? {};

    this.db.transaction(() => {
      // 1. Prune old pattern detections
      this.db.prepare(
        `DELETE FROM pattern_detections WHERE created_at < datetime('now', '-' || ? || ' days')`,
      ).run(patternDetectionMaxAgeDays);

      // 2. Prune oldest observations beyond cap
      this.db.prepare(
        `DELETE FROM observations WHERE id NOT IN (SELECT id FROM observations ORDER BY created_at DESC LIMIT ?)`,
      ).run(maxObservations);

      // 3. Prune observations from sessions beyond the last N
      const recentSessionIds = this.db.prepare(
        `SELECT id FROM sessions ORDER BY started_at DESC LIMIT ?`,
      ).all(maxSessionsIndexed) as Array<{ id: string }>;

      if (recentSessionIds.length > 0) {
        const placeholders = recentSessionIds.map(() => '?').join(',');
        this.db.prepare(
          `DELETE FROM observations WHERE session_id NOT IN (${placeholders}) AND session_id IS NOT NULL`,
        ).run(...recentSessionIds.map(r => r.id));
      }

      // 4. Rebuild FTS index after prune
      this.db.prepare(`INSERT INTO observations_fts(observations_fts) VALUES('rebuild')`).run();
    })();
  }

  // ---- Sessions ----

  async saveSession(session: SessionState): Promise<void> {
    const status = session.endedAt ? 'completed' : 'active';
    this.db.prepare(`
      INSERT OR REPLACE INTO sessions (id, memory_session_id, parent_session_id, branch, started_at, ended_at, status, model_id, data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      session.memorySessionId ?? null,
      session.parentSessionId ?? null,
      session.branch,
      session.startedAt,
      session.endedAt ?? null,
      status,
      session.aiProvider.modelId,
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

  // ---- Branches ----

  async saveBranch(branch: BranchContext): Promise<void> {
    this.db.prepare(`
      INSERT OR REPLACE INTO branches (name, data, archived, updated_at)
      VALUES (?, ?, 0, ?)
    `).run(branch.branch, JSON.stringify(branch), branch.updatedAt);
  }

  async getBranch(name: string): Promise<BranchContext | null> {
    const row = this.db.prepare('SELECT data FROM branches WHERE name = ?').get(name) as
      | { data: string }
      | undefined;
    return row ? (JSON.parse(row.data) as BranchContext) : null;
  }

  async listBranches(filter?: { archived?: boolean }): Promise<BranchContext[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.archived !== undefined) {
      conditions.push('archived = ?');
      params.push(filter.archived ? 1 : 0);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = this.db.prepare(
      `SELECT data FROM branches ${where} ORDER BY updated_at DESC`,
    ).all(...params) as Array<{ data: string }>;

    return rows.map(r => JSON.parse(r.data) as BranchContext);
  }

  async archiveBranch(name: string): Promise<void> {
    this.db.prepare('UPDATE branches SET archived = 1 WHERE name = ?').run(name);
  }

  // ---- Evolution ----

  async saveEvolutionCandidate(candidate: EvolutionCandidate): Promise<void> {
    this.db.prepare(`
      INSERT OR REPLACE INTO evolution_candidates (id, type, title, confidence, model_scope, status, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(
      candidate.id,
      candidate.type,
      candidate.title,
      candidate.confidence,
      candidate.modelScope ?? null,
      JSON.stringify(candidate),
      candidate.createdAt,
      candidate.updatedAt,
    );
  }

  async listEvolutionCandidates(filter?: EvolutionCandidateFilter): Promise<EvolutionCandidate[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.type) {
      conditions.push('type = ?');
      params.push(filter.type);
    }
    if (filter?.title) {
      conditions.push('title LIKE ?');
      params.push(`%${filter.title}%`);
    }
    if (filter?.modelScope) {
      conditions.push('model_scope = ?');
      params.push(filter.modelScope);
    }
    if (filter?.minConfidence !== undefined) {
      conditions.push('confidence >= ?');
      params.push(filter.minConfidence);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = this.db.prepare(
      `SELECT data FROM evolution_candidates ${where} ORDER BY confidence DESC`,
    ).all(...params) as Array<{ data: string }>;

    return rows.map(r => JSON.parse(r.data) as EvolutionCandidate);
  }

  async updateEvolutionCandidate(candidate: EvolutionCandidate): Promise<void> {
    this.db.prepare(`
      UPDATE evolution_candidates SET type = ?, title = ?, confidence = ?, model_scope = ?, data = ?, updated_at = ?
      WHERE id = ?
    `).run(
      candidate.type,
      candidate.title,
      candidate.confidence,
      candidate.modelScope ?? null,
      JSON.stringify(candidate),
      candidate.updatedAt,
      candidate.id,
    );
  }

  async deleteEvolutionCandidate(id: string): Promise<void> {
    this.db.prepare('DELETE FROM evolution_candidates WHERE id = ?').run(id);
  }

  async appendEvolutionLog(entry: EvolutionLogEntry): Promise<void> {
    this.db.prepare(`
      INSERT INTO evolution_log (id, candidate_id, action, title, confidence, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(entry.id, entry.candidateId, entry.action, entry.title, entry.confidence, entry.timestamp);
  }

  async getEvolutionLog(filter?: EvolutionLogFilter): Promise<EvolutionLogEntry[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.candidateId) {
      conditions.push('candidate_id = ?');
      params.push(filter.candidateId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filter?.limit ?? 50;

    const rows = this.db.prepare(
      `SELECT * FROM evolution_log ${where} ORDER BY timestamp DESC LIMIT ?`,
    ).all(...params, limit) as Array<Record<string, unknown>>;

    return rows.map(r => ({
      id: String(r['id']),
      candidateId: String(r['candidate_id']),
      action: String(r['action']) as EvolutionLogEntry['action'],
      title: String(r['title']),
      confidence: Number(r['confidence']),
      timestamp: String(r['timestamp']),
    }));
  }

  async saveEvolutionSnapshot(snapshot: EvolutionSnapshot): Promise<void> {
    this.db.prepare(`
      INSERT OR REPLACE INTO evolution_snapshots (id, candidate_id, before_state, applied_at)
      VALUES (?, ?, ?, ?)
    `).run(snapshot.id, snapshot.candidateId, JSON.stringify(snapshot.beforeState), snapshot.appliedAt);
  }

  async getEvolutionSnapshot(id: string): Promise<EvolutionSnapshot | null> {
    const row = this.db.prepare('SELECT * FROM evolution_snapshots WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return {
      id: String(row['id']),
      candidateId: String(row['candidate_id']),
      beforeState: JSON.parse(String(row['before_state'])) as Record<string, string>,
      appliedAt: String(row['applied_at']),
    };
  }

  // ---- Drafts ----

  async saveDraft(draft: DraftEntry): Promise<void> {
    this.db.prepare(`
      INSERT OR REPLACE INTO drafts (id, category, title, content, status, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      draft.id,
      draft.category,
      draft.title,
      draft.content,
      draft.status,
      draft.data ? JSON.stringify(draft.data) : null,
      draft.createdAt,
      draft.updatedAt,
    );
  }

  async getDraft(id: string): Promise<DraftEntry | null> {
    const row = this.db.prepare('SELECT * FROM drafts WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return this.rowToDraft(row);
  }

  async listDrafts(filter?: DraftFilter): Promise<DraftEntry[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }
    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = this.db.prepare(
      `SELECT * FROM drafts ${where} ORDER BY updated_at DESC`,
    ).all(...params) as Array<Record<string, unknown>>;

    return rows.map(r => this.rowToDraft(r));
  }

  async updateDraft(draft: DraftEntry): Promise<void> {
    this.db.prepare(`
      UPDATE drafts SET category = ?, title = ?, content = ?, status = ?, data = ?, updated_at = ?
      WHERE id = ?
    `).run(
      draft.category,
      draft.title,
      draft.content,
      draft.status,
      draft.data ? JSON.stringify(draft.data) : null,
      draft.updatedAt,
      draft.id,
    );
  }

  async deleteDraft(id: string): Promise<void> {
    this.db.prepare('DELETE FROM drafts WHERE id = ?').run(id);
  }

  // ---- Lifecycle ----

  async saveLifecycle(session: LifecycleSession): Promise<void> {
    this.db.prepare(`
      INSERT OR REPLACE INTO lifecycle_sessions (id, session_id, feature, current_phase, status, phases, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      session.sessionId ?? null,
      session.feature,
      session.currentPhase,
      session.status,
      JSON.stringify(session.phases),
      session.createdAt,
      session.updatedAt,
    );
  }

  async getLifecycle(id: string): Promise<LifecycleSession | null> {
    const row = this.db.prepare('SELECT * FROM lifecycle_sessions WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return this.rowToLifecycle(row);
  }

  async listLifecycles(filter?: LifecycleFilter): Promise<LifecycleSession[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filter?.limit ?? 50;

    const rows = this.db.prepare(
      `SELECT * FROM lifecycle_sessions ${where} ORDER BY updated_at DESC LIMIT ?`,
    ).all(...params, limit) as Array<Record<string, unknown>>;

    return rows.map(r => this.rowToLifecycle(r));
  }

  // ---- Permanent Memory ----

  async savePermanentMemory(entry: PermanentMemoryEntry): Promise<void> {
    this.db.prepare(`
      INSERT OR REPLACE INTO permanent_memory (id, type, title, content, created_at, session_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(entry.id, entry.type, entry.title, entry.content, entry.createdAt, entry.sessionId ?? null);
  }

  async getPermanentMemory(id: string): Promise<PermanentMemoryEntry | null> {
    const row = this.db.prepare('SELECT * FROM permanent_memory WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return this.rowToPermanentMemory(row);
  }

  async listPermanentMemory(filter?: PermanentMemoryFilter): Promise<PermanentMemoryEntry[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.type) {
      conditions.push('type = ?');
      params.push(filter.type);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filter?.limit ?? 100;

    const rows = this.db.prepare(
      `SELECT * FROM permanent_memory ${where} ORDER BY created_at DESC LIMIT ?`,
    ).all(...params, limit) as Array<Record<string, unknown>>;

    return rows.map(r => this.rowToPermanentMemory(r));
  }

  async deletePermanentMemory(id: string): Promise<void> {
    this.db.prepare('DELETE FROM permanent_memory WHERE id = ?').run(id);
  }

  // ---- Patterns ----

  async saveBannedPattern(pattern: BannedPattern): Promise<void> {
    this.db.prepare(`
      INSERT OR REPLACE INTO banned_patterns (id, category, pattern, type, severity, model_scope, origin, active, use_count, hint, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pattern.id,
      pattern.category,
      pattern.pattern,
      pattern.type,
      pattern.severity,
      pattern.modelScope ?? null,
      pattern.origin,
      pattern.active ? 1 : 0,
      pattern.useCount,
      pattern.hint ?? null,
      pattern.createdAt,
    );
  }

  async listBannedPatterns(filter?: BannedPatternFilter): Promise<BannedPattern[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.active !== undefined) {
      conditions.push('active = ?');
      params.push(filter.active ? 1 : 0);
    }
    if (filter?.modelScope) {
      conditions.push('(model_scope = ? OR model_scope IS NULL)');
      params.push(filter.modelScope);
    }
    if (filter?.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = this.db.prepare(
      `SELECT * FROM banned_patterns ${where} ORDER BY use_count DESC`,
    ).all(...params) as Array<Record<string, unknown>>;

    return rows.map(r => this.rowToBannedPattern(r));
  }

  async updateBannedPattern(pattern: BannedPattern): Promise<void> {
    this.db.prepare(`
      UPDATE banned_patterns SET category = ?, pattern = ?, type = ?, severity = ?, model_scope = ?, origin = ?, active = ?, use_count = ?, hint = ?
      WHERE id = ?
    `).run(
      pattern.category,
      pattern.pattern,
      pattern.type,
      pattern.severity,
      pattern.modelScope ?? null,
      pattern.origin,
      pattern.active ? 1 : 0,
      pattern.useCount,
      pattern.hint ?? null,
      pattern.id,
    );
  }

  async recordPatternDetection(detection: PatternDetection): Promise<void> {
    this.db.prepare(`
      INSERT INTO pattern_detections (session_id, model_id, pattern_id, matched_text, context, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      detection.sessionId ?? null,
      detection.modelId,
      detection.patternId ?? null,
      detection.matchedText,
      detection.context ?? null,
      detection.source,
      detection.createdAt,
    );

    // Increment use_count on the matched pattern
    if (detection.patternId) {
      this.db.prepare('UPDATE banned_patterns SET use_count = use_count + 1 WHERE id = ?').run(detection.patternId);
    }
  }

  async getPatternStats(filter: PatternStatsFilter): Promise<PatternStats> {
    const modelCondition = filter.modelId ? 'WHERE model_id = ?' : '';
    const modelParams = filter.modelId ? [filter.modelId] : [];

    const totalRow = this.db.prepare(
      `SELECT COUNT(*) as total FROM pattern_detections ${modelCondition}`,
    ).get(...modelParams) as { total: number };

    const modelRows = this.db.prepare(`
      SELECT model_id, COUNT(*) as detections
      FROM pattern_detections
      ${modelCondition}
      GROUP BY model_id
      ORDER BY detections DESC
      LIMIT 20
    `).all(...modelParams) as Array<{ model_id: string; detections: number }>;

    const topPatternRows = this.db.prepare(`
      SELECT
        pd.pattern_id,
        bp.pattern,
        bp.category,
        COUNT(*) as count,
        COUNT(DISTINCT pd.session_id) as unique_sessions
      FROM pattern_detections pd
      LEFT JOIN banned_patterns bp ON bp.id = pd.pattern_id
      ${filter.modelId ? 'WHERE pd.model_id = ?' : ''}
      GROUP BY pd.pattern_id
      ORDER BY count DESC
      LIMIT 20
    `).all(...modelParams) as Array<{
      pattern_id: string | null;
      pattern: string | null;
      category: string | null;
      count: number;
      unique_sessions: number;
    }>;

    return {
      totalDetections: totalRow.total,
      models: modelRows.map(r => ({
        modelId: r.model_id,
        detections: r.detections,
        summary: `${r.detections} detections`,
      })),
      topPatterns: topPatternRows.map(r => ({
        pattern: r.pattern ?? r.pattern_id ?? 'unknown',
        category: r.category ?? 'unknown',
        count: r.count,
        uniqueSessions: r.unique_sessions,
      })),
    };
  }

  async saveAuditScore(score: AuditScore): Promise<void> {
    this.db.prepare(`
      INSERT INTO audit_scores (session_id, model_id, input_hash, scores, verdict, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      score.sessionId ?? null,
      score.modelId,
      score.inputHash,
      JSON.stringify({ dimensions: score.dimensions, totalScore: score.totalScore, patternsFound: score.patternsFound }),
      score.verdict,
      score.createdAt,
    );
  }

  async listAuditScores(filter?: { sessionId?: string; modelId?: string; limit?: number }): Promise<AuditScore[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.sessionId) {
      conditions.push('session_id = ?');
      params.push(filter.sessionId);
    }
    if (filter?.modelId) {
      conditions.push('model_id = ?');
      params.push(filter.modelId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filter?.limit ?? 50;

    const rows = this.db.prepare(
      `SELECT * FROM audit_scores ${where} ORDER BY created_at DESC LIMIT ?`,
    ).all(...params, limit) as Array<Record<string, unknown>>;

    return rows.map(r => {
      const scores = JSON.parse(String(r['scores'])) as {
        dimensions: AuditScore['dimensions'];
        totalScore: number;
        patternsFound: number;
      };
      return {
        id: Number(r['id']),
        sessionId: r['session_id'] ? String(r['session_id']) : undefined,
        modelId: String(r['model_id']),
        inputHash: String(r['input_hash']),
        totalScore: scores.totalScore,
        dimensions: scores.dimensions,
        patternsFound: scores.patternsFound,
        verdict: String(r['verdict']) as AuditScore['verdict'],
        createdAt: String(r['created_at']),
      };
    });
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

  private rowToDraft(row: Record<string, unknown>): DraftEntry {
    return {
      id: String(row['id']),
      category: String(row['category']),
      title: String(row['title']),
      content: String(row['content'] ?? ''),
      status: String(row['status']) as DraftEntry['status'],
      data: row['data'] ? (JSON.parse(String(row['data'])) as Record<string, unknown>) : undefined,
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    };
  }

  private rowToLifecycle(row: Record<string, unknown>): LifecycleSession {
    return {
      id: String(row['id']),
      sessionId: row['session_id'] ? String(row['session_id']) : undefined,
      feature: String(row['feature']),
      currentPhase: String(row['current_phase']) as LifecycleSession['currentPhase'],
      status: String(row['status']) as LifecycleSession['status'],
      phases: JSON.parse(String(row['phases'])) as LifecycleSession['phases'],
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    };
  }

  private rowToPermanentMemory(row: Record<string, unknown>): PermanentMemoryEntry {
    return {
      id: String(row['id']),
      type: String(row['type']) as PermanentMemoryEntry['type'],
      title: String(row['title']),
      content: String(row['content']),
      createdAt: String(row['created_at']),
      sessionId: row['session_id'] ? String(row['session_id']) : undefined,
    };
  }

  private rowToBannedPattern(row: Record<string, unknown>): BannedPattern {
    return {
      id: String(row['id']),
      category: String(row['category']) as BannedPattern['category'],
      pattern: String(row['pattern']),
      type: String(row['type']) as BannedPattern['type'],
      severity: String(row['severity']) as BannedPattern['severity'],
      modelScope: row['model_scope'] ? String(row['model_scope']) : undefined,
      hint: row['hint'] ? String(row['hint']) : undefined,
      origin: String(row['origin']) as BannedPattern['origin'],
      active: Number(row['active']) === 1,
      useCount: Number(row['use_count']),
      createdAt: String(row['created_at']),
    };
  }
}
