#!/usr/bin/env node
/**
 * LTUM Reset Check
 * Detects when metadata-first mode should temporarily escalate to full sync.
 *
 * Usage:
 *   node scripts/ltum/reset-check.mjs
 *   node scripts/ltum/reset-check.mjs --json
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');

function parseArgs(argv) {
  const args = {
    json: false,
    quiet: false,
    file: '',
  };

  for (let i = 0; i < argv.length; i++) {
    const current = argv[i];
    if (current === '--json') args.json = true;
    if (current === '--quiet') args.quiet = true;
    if (current === '--file' && argv[i + 1]) {
      args.file = String(argv[i + 1]);
      i++;
    }
  }
  return args;
}

function runGit(command) {
  try {
    return execSync(command, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function loadConfig() {
  const defaults = {
    enabled: true,
    enforceResetOnEdit: true,
    enforceTelemetryOnEnd: true,
    requireStartupTimingOnEnd: false,
    maxFilesBeforeReset: 8,
    maxChangedLinesBeforeReset: 400,
    maxCrossModuleBoundaries: 2,
    maxActiveSessions: 1,
    maxStaleActiveSessions: 0,
    requireDocsAiSync: true,
  };

  const cfgPath = resolve(root, 'scripts', 'ltum', 'config.json');
  if (!existsSync(cfgPath)) return defaults;

  try {
    const parsed = JSON.parse(readFileSync(cfgPath, 'utf8'));
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function readChangedFiles(extraFilePath = '') {
  const output = runGit('git diff --name-only --relative');
  const untracked = runGit('git ls-files --others --exclude-standard');
  const files = (output + '\n' + untracked)
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);
  if (extraFilePath) {
    const normalized = extraFilePath.replaceAll('\\', '/');
    if (!files.includes(normalized)) files.push(normalized);
  }
  return files;
}

function readChangedLines() {
  const output = runGit('git diff --numstat --relative');
  let total = 0;
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) continue;
    const added = parts[0] === '-' ? 0 : Number(parts[0]);
    const removed = parts[1] === '-' ? 0 : Number(parts[1]);
    if (Number.isFinite(added)) total += added;
    if (Number.isFinite(removed)) total += removed;
  }
  return total;
}

function classifyBoundary(filePath) {
  const path = filePath.replaceAll('\\', '/');
  if (path.startsWith('packages/shared/')) return 'shared';
  if (path.startsWith('mcps/mcp-aidd-core/')) return 'core';
  if (path.startsWith('mcps/mcp-aidd-memory/')) return 'memory';
  if (path.startsWith('mcps/mcp-aidd-tools/')) return 'tools';
  if (path.startsWith('mcps/mcp-aidd-engine/')) return 'engine';
  if (path.startsWith('apps/hub/')) return 'hub';
  if (path.startsWith('scripts/hooks/')) return 'hooks';
  if (path.startsWith('docs/ai/')) return 'docs-ai';
  if (path.startsWith('content/')) return 'content';
  return 'other';
}

function querySessionState() {
  const dbPath = resolve(root, '.aidd', 'data.db');
  if (!existsSync(dbPath)) {
    return { activeSessions: 0, staleActiveSessions: 0 };
  }

  const db = new Database(dbPath, { readonly: true });
  try {
    const activeRow = db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE status = 'active'").get();
    const staleRow = db
      .prepare(
        "SELECT COUNT(*) AS n FROM sessions WHERE status = 'active' AND COALESCE(json_extract(data, '$.endedAt'), '') <> ''"
      )
      .get();
    return {
      activeSessions: Number(activeRow?.n ?? 0),
      staleActiveSessions: Number(staleRow?.n ?? 0),
    };
  } finally {
    db.close();
  }
}

function createReport(args) {
  const config = loadConfig();
  if (!config.enabled) {
    return {
      mode: 'ltum',
      enabled: false,
      requiresFullSync: false,
      hardReasons: [],
      softReasons: [],
      metrics: {},
      nextAction: 'LTUM disabled in scripts/ltum/config.json',
    };
  }

  const changedFiles = readChangedFiles(args.file);
  const changedLines = readChangedLines();
  const boundaries = [...new Set(changedFiles.map(classifyBoundary))];
  const sessionState = querySessionState();

  const hasShared = boundaries.includes('shared');
  const hasRuntime = ['core', 'memory', 'tools', 'engine', 'hub'].some((b) => boundaries.includes(b));
  const schemaTouched = changedFiles.some((f) =>
    /(migrations\.ts|sqlite-backend\.ts|sqlite_memory_adapter\.rs|\.sql$|data\.db$)/.test(f)
  );
  const docsAiTouched = changedFiles.some((f) => f.startsWith('docs/ai/'));
  const docsRelevantTouched = changedFiles.some((f) =>
    /(mcps\/.*\/src\/modules\/.*index\.ts|migrations\.ts|detector\.ts|packages\/shared\/src\/types\.ts|packages\/shared\/src\/schemas\.ts)/.test(
      f
    )
  );

  const hardReasons = [];
  const softReasons = [];

  if (schemaTouched) {
    hardReasons.push('Schema/storage files changed: run full sync + migration verification before further mutations.');
  }
  if (hasShared && hasRuntime) {
    softReasons.push('Cross-boundary change detected (packages/shared + runtime modules). Run full sync before ship.');
  }
  if (config.requireDocsAiSync && docsRelevantTouched && !docsAiTouched) {
    softReasons.push('Code/docs parity risk: docs/ai not updated after tool/schema-relevant changes.');
  }

  if (changedFiles.length > config.maxFilesBeforeReset) {
    softReasons.push(
      `Large active diff (${changedFiles.length} files) exceeds LTUM threshold (${config.maxFilesBeforeReset}).`
    );
  }
  if (changedLines > config.maxChangedLinesBeforeReset) {
    softReasons.push(
      `Large active diff size (${changedLines} changed lines) exceeds LTUM threshold (${config.maxChangedLinesBeforeReset}).`
    );
  }
  if (boundaries.length > config.maxCrossModuleBoundaries) {
    softReasons.push(
      `Cross-module surface is wide (${boundaries.length} boundaries), threshold is ${config.maxCrossModuleBoundaries}.`
    );
  }
  if (sessionState.activeSessions > config.maxActiveSessions) {
    softReasons.push(
      `Multiple active sessions (${sessionState.activeSessions}) increase context-blindness risk.`
    );
  }
  if (sessionState.staleActiveSessions > config.maxStaleActiveSessions) {
    softReasons.push(
      `Stale active sessions (${sessionState.staleActiveSessions}) detected; close or clean before ship.`
    );
  }

  return {
    mode: 'ltum',
    enabled: true,
    requiresFullSync: hardReasons.length > 0,
    hardReasons,
    softReasons,
    metrics: {
      changedFiles: changedFiles.length,
      changedLines,
      boundaries,
      activeSessions: sessionState.activeSessions,
      staleActiveSessions: sessionState.staleActiveSessions,
    },
    nextAction:
      hardReasons.length > 0
        ? 'Run full sync checks: pnpm mcp:typecheck && pnpm mcp:build && pnpm mcp:docs:check'
        : 'LTUM safe: continue metadata-first and hunk-only workflow.',
  };
}

function printText(report) {
  if (!report.enabled) {
    console.log('[LTUM] disabled');
    return;
  }

  const status = report.requiresFullSync ? 'FULL_SYNC_REQUIRED' : 'OK';
  console.log(`[LTUM] ${status}`);
  console.log(
    `- changed: ${report.metrics.changedFiles} files, ${report.metrics.changedLines} lines; boundaries: ${report.metrics.boundaries.join(', ') || 'none'}`
  );
  console.log(
    `- sessions: active=${report.metrics.activeSessions}, staleActive=${report.metrics.staleActiveSessions}`
  );
  if (report.hardReasons.length > 0) {
    console.log('- hard reasons:');
    for (const reason of report.hardReasons) console.log(`  - ${reason}`);
  }
  if (report.softReasons.length > 0) {
    console.log('- soft warnings:');
    for (const warning of report.softReasons) console.log(`  - ${warning}`);
  }
  console.log(`- next: ${report.nextAction}`);
}

const args = parseArgs(process.argv.slice(2));
const report = createReport(args);

if (args.json) {
  process.stdout.write(JSON.stringify(report, null, 2));
} else if (!args.quiet) {
  printText(report);
}

process.exit(report.requiresFullSync ? 2 : 0);
