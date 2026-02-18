#!/usr/bin/env node
/**
 * LTUM Session Normalizer
 * Repairs session status anomalies in local project DB only.
 *
 * Fixes:
 * - status='active' with endedAt present -> status='completed'
 *
 * Usage:
 *   node scripts/ltum/normalize-sessions.mjs
 *   node scripts/ltum/normalize-sessions.mjs --dry-run
 *   node scripts/ltum/normalize-sessions.mjs --json
 */
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');
const dbPath = resolve(root, '.aidd', 'data.db');

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    json: argv.includes('--json'),
    quiet: argv.includes('--quiet'),
  };
}

function normalize(args) {
  if (!existsSync(dbPath)) {
    return {
      ok: false,
      reason: '.aidd/data.db not found',
      staleActiveFound: 0,
      staleActiveFixed: 0,
      activeAfter: 0,
      completedAfter: 0,
    };
  }

  const db = new Database(dbPath);
  try {
    const staleRows = db
      .prepare(
        "SELECT id FROM sessions WHERE status = 'active' AND COALESCE(json_extract(data, '$.endedAt'), '') <> '' ORDER BY started_at DESC"
      )
      .all();

    let fixed = 0;
    if (!args.dryRun && staleRows.length > 0) {
      const update = db.prepare("UPDATE sessions SET status = 'completed' WHERE id = ?");
      const tx = db.transaction((rows) => {
        for (const row of rows) {
          update.run(row.id);
        }
      });
      tx(staleRows);
      fixed = staleRows.length;
    }

    const activeAfter = Number(
      db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE status = 'active'").get()?.n ?? 0
    );
    const completedAfter = Number(
      db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE status = 'completed'").get()?.n ?? 0
    );

    return {
      ok: true,
      staleActiveFound: staleRows.length,
      staleActiveFixed: fixed,
      activeAfter,
      completedAfter,
      dryRun: args.dryRun,
      dbPath,
    };
  } finally {
    db.close();
  }
}

const args = parseArgs(process.argv.slice(2));
const report = normalize(args);

if (args.json) {
  process.stdout.write(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

if (!args.quiet) {
  if (!report.ok) {
    console.log(`[LTUM] Session normalize skipped: ${report.reason}`);
  } else {
    console.log('[LTUM] Session normalization');
    console.log(`- stale active found: ${report.staleActiveFound}`);
    console.log(`- stale active fixed: ${report.staleActiveFixed}`);
    console.log(`- sessions after: active=${report.activeAfter}, completed=${report.completedAfter}`);
    if (report.dryRun) {
      console.log('- mode: dry-run');
    }
  }
}

process.exit(report.ok ? 0 : 1);
