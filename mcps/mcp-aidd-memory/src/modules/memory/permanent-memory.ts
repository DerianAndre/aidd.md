import { resolve } from 'node:path';
import { ensureDir, writeJsonFile } from '@aidd.md/mcp-shared';
import type { StorageBackend, PermanentMemoryEntry } from '@aidd.md/mcp-shared';

// ---------------------------------------------------------------------------
// Types matching shared schemas
// ---------------------------------------------------------------------------

export interface DecisionEntry {
  id: string;
  decision: string;
  reasoning: string;
  alternatives?: string[];
  context?: string;
  createdAt: string;
  sessionId?: string;
}

export interface MistakeEntry {
  id: string;
  error: string;
  rootCause: string;
  fix: string;
  prevention: string;
  occurrences: number;
  createdAt: string;
  lastSeenAt: string;
  sessionId?: string;
}

export interface ConventionEntry {
  id: string;
  convention: string;
  example: string;
  rationale?: string;
  createdAt: string;
  sessionId?: string;
}

// ---------------------------------------------------------------------------
// Directory detection
// ---------------------------------------------------------------------------

export function findMemoryDir(projectRoot: string): string {
  return resolve(projectRoot, '.aidd', 'memory');
}

// ---------------------------------------------------------------------------
// Conversion: PermanentMemoryEntry <-> specific types
// ---------------------------------------------------------------------------

export function decisionToEntry(d: DecisionEntry): PermanentMemoryEntry {
  return {
    id: d.id,
    type: 'decision',
    title: d.decision,
    content: JSON.stringify({ reasoning: d.reasoning, alternatives: d.alternatives, context: d.context }),
    createdAt: d.createdAt,
    sessionId: d.sessionId,
  };
}

export function entryToDecision(e: PermanentMemoryEntry): DecisionEntry {
  const data = JSON.parse(e.content) as Record<string, unknown>;
  return {
    id: e.id,
    decision: e.title,
    reasoning: String(data['reasoning'] ?? ''),
    alternatives: data['alternatives'] as string[] | undefined,
    context: data['context'] ? String(data['context']) : undefined,
    createdAt: e.createdAt,
    sessionId: e.sessionId,
  };
}

export function mistakeToEntry(m: MistakeEntry): PermanentMemoryEntry {
  return {
    id: m.id,
    type: 'mistake',
    title: m.error,
    content: JSON.stringify({
      rootCause: m.rootCause,
      fix: m.fix,
      prevention: m.prevention,
      occurrences: m.occurrences,
      lastSeenAt: m.lastSeenAt,
    }),
    createdAt: m.createdAt,
    sessionId: m.sessionId,
  };
}

export function entryToMistake(e: PermanentMemoryEntry): MistakeEntry {
  const data = JSON.parse(e.content) as Record<string, unknown>;
  return {
    id: e.id,
    error: e.title,
    rootCause: String(data['rootCause'] ?? ''),
    fix: String(data['fix'] ?? ''),
    prevention: String(data['prevention'] ?? ''),
    occurrences: Number(data['occurrences'] ?? 1),
    createdAt: e.createdAt,
    lastSeenAt: String(data['lastSeenAt'] ?? e.createdAt),
    sessionId: e.sessionId,
  };
}

export function conventionToEntry(c: ConventionEntry): PermanentMemoryEntry {
  return {
    id: c.id,
    type: 'convention',
    title: c.convention,
    content: JSON.stringify({ example: c.example, rationale: c.rationale }),
    createdAt: c.createdAt,
    sessionId: c.sessionId,
  };
}

export function entryToConvention(e: PermanentMemoryEntry): ConventionEntry {
  const data = JSON.parse(e.content) as Record<string, unknown>;
  return {
    id: e.id,
    convention: e.title,
    example: String(data['example'] ?? ''),
    rationale: data['rationale'] ? String(data['rationale']) : undefined,
    createdAt: e.createdAt,
    sessionId: e.sessionId,
  };
}

// ---------------------------------------------------------------------------
// Export: SQLite -> JSON files (on-demand)
// ---------------------------------------------------------------------------

export async function exportPermanentMemoryToJson(
  backend: StorageBackend,
  memoryDir: string,
): Promise<{ decisions: number; mistakes: number; conventions: number }> {
  ensureDir(memoryDir);

  const decisionEntries = await backend.listPermanentMemory({ type: 'decision' });
  const mistakeEntries = await backend.listPermanentMemory({ type: 'mistake' });
  const conventionEntries = await backend.listPermanentMemory({ type: 'convention' });

  const decisions = decisionEntries.map(entryToDecision);
  const mistakes = mistakeEntries.map(entryToMistake);
  const conventions = conventionEntries.map(entryToConvention);

  writeJsonFile(resolve(memoryDir, 'decisions.json'), decisions);
  writeJsonFile(resolve(memoryDir, 'mistakes.json'), mistakes);
  writeJsonFile(resolve(memoryDir, 'conventions.json'), conventions);

  return {
    decisions: decisions.length,
    mistakes: mistakes.length,
    conventions: conventions.length,
  };
}
