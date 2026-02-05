import { resolve } from 'node:path';
import {
  ensureDir,
  readJsonFile,
  writeJsonFile,
  listFiles,
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

// ---------------------------------------------------------------------------
// Search helpers
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'and', 'but', 'or', 'not', 'this', 'that', 'it', 'i', 'me', 'my',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function scoreMatch(queryTokens: string[], targetTokens: string[]): number {
  if (queryTokens.length === 0 || targetTokens.length === 0) return 0;
  const targetSet = new Set(targetTokens);
  const matches = queryTokens.filter((t) => targetSet.has(t)).length;
  return matches / Math.max(queryTokens.length, 1);
}

// ---------------------------------------------------------------------------
// JSON Backend
// ---------------------------------------------------------------------------

export class JsonBackend implements StorageBackend {
  readonly name = 'json';
  private sessionsActiveDir: string;
  private sessionsCompletedDir: string;
  private analyticsDir: string;

  constructor(private config: StorageConfig) {
    this.sessionsActiveDir = resolve(config.aiddDir, 'sessions', 'active');
    this.sessionsCompletedDir = resolve(config.aiddDir, 'sessions', 'completed');
    this.analyticsDir = resolve(config.aiddDir, 'analytics');
  }

  async initialize(): Promise<void> {
    ensureDir(this.sessionsActiveDir);
    ensureDir(this.sessionsCompletedDir);
    ensureDir(this.analyticsDir);
  }

  async close(): Promise<void> {
    // No-op for JSON backend
  }

  // ---- Sessions ----

  async saveSession(session: SessionState): Promise<void> {
    const dir = session.endedAt ? this.sessionsCompletedDir : this.sessionsActiveDir;
    writeJsonFile(resolve(dir, `${session.id}.json`), session);

    // If ending, remove from active
    if (session.endedAt) {
      const activePath = resolve(this.sessionsActiveDir, `${session.id}.json`);
      try {
        const { unlinkSync } = await import('node:fs');
        unlinkSync(activePath);
      } catch {
        // Already moved or doesn't exist
      }
    }
  }

  async getSession(id: string): Promise<SessionState | null> {
    const active = readJsonFile<SessionState>(resolve(this.sessionsActiveDir, `${id}.json`));
    if (active) return active;
    return readJsonFile<SessionState>(resolve(this.sessionsCompletedDir, `${id}.json`));
  }

  async listSessions(filter?: SessionFilter): Promise<MemoryIndexEntry[]> {
    const entries: MemoryIndexEntry[] = [];

    const dirs: string[] = [];
    if (!filter?.status || filter.status === 'active') dirs.push(this.sessionsActiveDir);
    if (!filter?.status || filter.status === 'completed') dirs.push(this.sessionsCompletedDir);

    for (const dir of dirs) {
      const files = listFiles(dir, { extensions: ['.json'] });
      for (const file of files) {
        const session = readJsonFile<SessionState>(file);
        if (!session) continue;

        if (filter?.branch && session.branch !== filter.branch) continue;
        if (filter?.memorySessionId && session.memorySessionId !== filter.memorySessionId) continue;

        entries.push({
          id: session.id,
          type: 'insight',
          title: `Session ${session.id} (${session.branch})`,
          snippet: `${session.aiProvider.model} | ${session.decisions.length} decisions | ${session.filesModified.length} files`,
          createdAt: session.startedAt,
          sessionId: session.id,
        });
      }
    }

    // Sort by date descending
    entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 50;
    return entries.slice(offset, offset + limit);
  }

  // ---- Observations ----

  async saveObservation(observation: SessionObservation): Promise<void> {
    const filePath = resolve(this.sessionsActiveDir, `${observation.sessionId}-observations.json`);
    const existing = readJsonFile<SessionObservation[]>(filePath) ?? [];
    existing.push(observation);
    writeJsonFile(filePath, existing);
  }

  async getObservation(id: string): Promise<SessionObservation | null> {
    const files = listFiles(this.sessionsActiveDir, { extensions: ['.json'] });
    for (const file of files) {
      if (!file.endsWith('-observations.json')) continue;
      const observations = readJsonFile<SessionObservation[]>(file);
      if (!observations) continue;
      const found = observations.find((o) => o.id === id);
      if (found) return found;
    }
    // Also check completed sessions
    const completedFiles = listFiles(this.sessionsCompletedDir, { extensions: ['.json'] });
    for (const file of completedFiles) {
      if (!file.endsWith('-observations.json')) continue;
      const observations = readJsonFile<SessionObservation[]>(file);
      if (!observations) continue;
      const found = observations.find((o) => o.id === id);
      if (found) return found;
    }
    return null;
  }

  // ---- Search (3-layer) ----

  async search(query: string, options?: SearchOptions): Promise<MemoryIndexEntry[]> {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const results: MemoryIndexEntry[] = [];

    // Search observations
    const allObservations = await this.loadAllObservations();
    for (const obs of allObservations) {
      if (options?.type) {
        const types = Array.isArray(options.type) ? options.type : [options.type];
        if (!types.includes(obs.type)) continue;
      }
      if (options?.sessionId && obs.sessionId !== options.sessionId) continue;
      if (options?.dateStart && obs.createdAt < options.dateStart) continue;
      if (options?.dateEnd && obs.createdAt > options.dateEnd) continue;

      const targetTokens = tokenize(
        [obs.title, obs.narrative ?? '', ...(obs.facts ?? []), ...(obs.concepts ?? [])].join(' '),
      );
      const score = scoreMatch(queryTokens, targetTokens);
      if (score > 0) {
        results.push({
          id: obs.id,
          type: obs.type,
          title: obs.title,
          snippet: (obs.narrative ?? obs.facts?.join('; ') ?? '').slice(0, 100),
          createdAt: obs.createdAt,
          sessionId: obs.sessionId,
          relevanceScore: Math.round(score * 100) / 100,
        });
      }
    }

    // Search permanent memory
    const pmEntries = await this.loadPermanentMemory();
    for (const pm of pmEntries) {
      if (options?.type) {
        const types = Array.isArray(options.type) ? options.type : [options.type];
        if (!types.includes(pm.type)) continue;
      }

      const targetTokens = tokenize(`${pm.title} ${pm.content}`);
      const score = scoreMatch(queryTokens, targetTokens);
      if (score > 0) {
        results.push({
          id: pm.id,
          type: pm.type,
          title: pm.title,
          snippet: pm.content.slice(0, 100),
          createdAt: pm.createdAt,
          sessionId: pm.sessionId,
          relevanceScore: Math.round(score * 100) / 100,
        });
      }
    }

    // Sort by relevance or date
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
    const allEntries = await this.loadAllIndexEntries();
    allEntries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const anchorIdx = allEntries.findIndex((e) => e.id === anchorId);
    if (anchorIdx === -1) {
      return {
        anchor: { id: anchorId, type: 'insight', title: 'Not found', snippet: '', createdAt: now() },
        before: [],
        after: [],
      };
    }

    return {
      anchor: allEntries[anchorIdx]!,
      before: allEntries.slice(Math.max(0, anchorIdx - depth), anchorIdx),
      after: allEntries.slice(anchorIdx + 1, anchorIdx + 1 + depth),
    };
  }

  async getByIds(ids: string[]): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = [];
    const idSet = new Set(ids);

    // Check observations
    const allObs = await this.loadAllObservations();
    for (const obs of allObs) {
      if (!idSet.has(obs.id)) continue;
      results.push({
        id: obs.id,
        type: obs.type,
        title: obs.title,
        content: obs.narrative ?? obs.facts?.join('\n') ?? '',
        facts: obs.facts,
        narrative: obs.narrative,
        concepts: obs.concepts,
        filesRead: obs.filesRead,
        filesModified: obs.filesModified,
        discoveryTokens: obs.discoveryTokens,
        createdAt: obs.createdAt,
        sessionId: obs.sessionId,
      });
      idSet.delete(obs.id);
    }

    // Check permanent memory
    if (idSet.size > 0) {
      const pmEntries = await this.loadPermanentMemory();
      for (const pm of pmEntries) {
        if (!idSet.has(pm.id)) continue;
        results.push(pm);
        idSet.delete(pm.id);
      }
    }

    return results;
  }

  // ---- Analytics ----

  async recordToolUsage(entry: ToolUsageEntry): Promise<void> {
    const filePath = resolve(this.analyticsDir, 'tool-usage.json');
    const existing = readJsonFile<ToolUsageEntry[]>(filePath) ?? [];
    existing.push(entry);
    writeJsonFile(filePath, existing);
  }

  async getAnalytics(query: AnalyticsQuery): Promise<AnalyticsResult> {
    if (query.metric === 'tool_usage') {
      const filePath = resolve(this.analyticsDir, 'tool-usage.json');
      const entries = readJsonFile<ToolUsageEntry[]>(filePath) ?? [];

      // Filter by date
      const filtered = entries.filter((e) => {
        if (query.dateStart && e.timestamp < query.dateStart) return false;
        if (query.dateEnd && e.timestamp > query.dateEnd) return false;
        return true;
      });

      // Group by tool name
      const groups = new Map<string, number>();
      for (const e of filtered) {
        groups.set(e.toolName, (groups.get(e.toolName) ?? 0) + 1);
      }

      const resultEntries = [...groups.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count);

      const limit = query.limit ?? 50;
      return {
        metric: 'tool_usage',
        entries: resultEntries.slice(0, limit),
        total: filtered.length,
      };
    }

    return { metric: query.metric, entries: [], total: 0 };
  }

  // ---- Private helpers ----

  private async loadAllObservations(): Promise<SessionObservation[]> {
    const all: SessionObservation[] = [];
    for (const dir of [this.sessionsActiveDir, this.sessionsCompletedDir]) {
      const files = listFiles(dir, { extensions: ['.json'] });
      for (const file of files) {
        if (!file.endsWith('-observations.json')) continue;
        const observations = readJsonFile<SessionObservation[]>(file);
        if (observations) all.push(...observations);
      }
    }
    return all;
  }

  private async loadPermanentMemory(): Promise<MemoryEntry[]> {
    const entries: MemoryEntry[] = [];
    const memDir = this.config.memoryDir;

    // decisions.json
    const decisions = readJsonFile<Array<{
      id: string; decision: string; reasoning: string;
      alternatives?: string[]; context?: string;
      createdAt: string; sessionId?: string;
    }>>(resolve(memDir, 'decisions.json'));
    if (decisions) {
      for (const d of decisions) {
        entries.push({
          id: d.id,
          type: 'decision',
          title: d.decision,
          content: `${d.reasoning}${d.context ? `\nContext: ${d.context}` : ''}`,
          facts: d.alternatives,
          createdAt: d.createdAt,
          sessionId: d.sessionId,
        });
      }
    }

    // mistakes.json
    const mistakes = readJsonFile<Array<{
      id: string; error: string; rootCause: string; fix: string;
      prevention: string; occurrences: number;
      createdAt: string; lastSeenAt: string; sessionId?: string;
    }>>(resolve(memDir, 'mistakes.json'));
    if (mistakes) {
      for (const m of mistakes) {
        entries.push({
          id: m.id,
          type: 'mistake',
          title: m.error,
          content: `Root cause: ${m.rootCause}\nFix: ${m.fix}\nPrevention: ${m.prevention}`,
          facts: [`Occurrences: ${m.occurrences}`],
          createdAt: m.createdAt,
          sessionId: m.sessionId,
        });
      }
    }

    // conventions.json
    const conventions = readJsonFile<Array<{
      id: string; convention: string; example: string;
      rationale?: string; createdAt: string; sessionId?: string;
    }>>(resolve(memDir, 'conventions.json'));
    if (conventions) {
      for (const c of conventions) {
        entries.push({
          id: c.id,
          type: 'convention',
          title: c.convention,
          content: `Example: ${c.example}${c.rationale ? `\nRationale: ${c.rationale}` : ''}`,
          createdAt: c.createdAt,
          sessionId: c.sessionId,
        });
      }
    }

    return entries;
  }

  private async loadAllIndexEntries(): Promise<MemoryIndexEntry[]> {
    const entries: MemoryIndexEntry[] = [];

    const allObs = await this.loadAllObservations();
    for (const obs of allObs) {
      entries.push({
        id: obs.id,
        type: obs.type,
        title: obs.title,
        snippet: (obs.narrative ?? obs.facts?.join('; ') ?? '').slice(0, 100),
        createdAt: obs.createdAt,
        sessionId: obs.sessionId,
      });
    }

    const pmEntries = await this.loadPermanentMemory();
    for (const pm of pmEntries) {
      entries.push({
        id: pm.id,
        type: pm.type,
        title: pm.title,
        snippet: pm.content.slice(0, 100),
        createdAt: pm.createdAt,
        sessionId: pm.sessionId,
      });
    }

    return entries;
  }
}
