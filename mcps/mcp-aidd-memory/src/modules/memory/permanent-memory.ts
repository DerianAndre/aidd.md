import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { readJsonFile, writeJsonFile, ensureDir } from '@aidd.md/mcp-shared';

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
  // Check ai/memory/ first (AIDD standard)
  const aiMemory = resolve(projectRoot, 'ai', 'memory');
  if (existsSync(aiMemory)) return aiMemory;

  // Check root-level memory/
  const rootMemory = resolve(projectRoot, 'memory');
  if (existsSync(rootMemory)) return rootMemory;

  // Default to ai/memory/ (will be created on first write)
  return aiMemory;
}

// ---------------------------------------------------------------------------
// CRUD helpers
// ---------------------------------------------------------------------------

export function readDecisions(memoryDir: string): DecisionEntry[] {
  return readJsonFile<DecisionEntry[]>(resolve(memoryDir, 'decisions.json')) ?? [];
}

export function writeDecisions(memoryDir: string, entries: DecisionEntry[]): void {
  ensureDir(memoryDir);
  writeJsonFile(resolve(memoryDir, 'decisions.json'), entries);
}

export function readMistakes(memoryDir: string): MistakeEntry[] {
  return readJsonFile<MistakeEntry[]>(resolve(memoryDir, 'mistakes.json')) ?? [];
}

export function writeMistakes(memoryDir: string, entries: MistakeEntry[]): void {
  ensureDir(memoryDir);
  writeJsonFile(resolve(memoryDir, 'mistakes.json'), entries);
}

export function readConventions(memoryDir: string): ConventionEntry[] {
  return readJsonFile<ConventionEntry[]>(resolve(memoryDir, 'conventions.json')) ?? [];
}

export function writeConventions(memoryDir: string, entries: ConventionEntry[]): void {
  ensureDir(memoryDir);
  writeJsonFile(resolve(memoryDir, 'conventions.json'), entries);
}
