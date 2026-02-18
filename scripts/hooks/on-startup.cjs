#!/usr/bin/env node
// AIDD Hook: SessionStart(startup)
// Queries .aidd/data.db for active session + orphaned artifacts.
// Validates session endedAt to avoid reporting stale/ended sessions as active.
// Adapter-agnostic — referenced by .claude/settings.json and other adapters.
const Database = require('better-sqlite3');
const { resolve } = require('path');
const { execFileSync } = require('child_process');
try {
  // LTUM hygiene: fix stale active sessions locally before reporting state.
  try {
    execFileSync('node', ['scripts/ltum/normalize-sessions.mjs', '--quiet'], {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
  } catch { /* fail-open */ }

  const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });
  const session = db.prepare("SELECT id, branch, data FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get();
  const arts = db.prepare("SELECT type, count(*) as cnt FROM artifacts WHERE status = 'active' GROUP BY type").all();
  db.close();
  if (session) {
    const s = JSON.parse(session.data);
    if (s.endedAt) {
      const orphaned = arts.reduce((sum, a) => sum + a.cnt, 0);
      const lines = ['[AIDD] No active session (stale session detected).'];
      if (orphaned > 0) lines.push(`  - ${orphaned} orphaned artifact(s) found`);
      lines.push('Call aidd_start. Follow the AIDD workflow.');
      console.log(lines.join('\n'));
    } else {
      const lines = [`[AIDD] Active session: ${session.id} (branch: ${session.branch}).`];
      if (s.input) lines.push(`  - Input: "${s.input}"`);
      const artTotal = arts.reduce((sum, a) => sum + a.cnt, 0);
      if (artTotal > 0) lines.push(`  - ${artTotal} active artifact(s)`);
      lines.push('Resume or end it. Follow the AIDD workflow.');
      console.log(lines.join('\n'));
    }
  } else {
    const orphaned = arts.reduce((sum, a) => sum + a.cnt, 0);
    const lines = ['[AIDD] No active session.'];
    if (orphaned > 0) lines.push(`  - ${orphaned} orphaned artifact(s) found`);
    lines.push('Call aidd_start. Follow the AIDD workflow.');
    console.log(lines.join('\n'));
  }
} catch { console.log('[AIDD] No active session. Call aidd_start. Follow the AIDD workflow.'); }
