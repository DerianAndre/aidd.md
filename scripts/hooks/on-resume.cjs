#!/usr/bin/env node
// AIDD Hook: SessionStart(resume|compact|clear)
// Recovers session context with task counts + active artifact summary.
// Validates session endedAt to avoid reporting stale/ended sessions as active.
// Adapter-agnostic — referenced by .claude/settings.json and other adapters.
const Database = require('better-sqlite3');
const { resolve } = require('path');
try {
  const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });
  const row = db.prepare("SELECT id, branch, data FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get();
  const arts = db.prepare("SELECT type, count(*) as cnt FROM artifacts WHERE status = 'active' GROUP BY type").all();
  db.close();
  if (row) {
    const s = JSON.parse(row.data);
    if (s.endedAt) {
      console.log(`[AIDD] Stale session detected (${row.id}). Call aidd_start.`);
    } else {
      const lines = [`[AIDD] Context recovered. Session: ${row.id} (branch: ${row.branch}).`];
      if (s.input) lines.push(`  - Input: "${s.input}"`);
      lines.push(`  - ${(s.tasksCompleted || []).length} done, ${(s.tasksPending || []).length} pending`);
      const artTotal = arts.reduce((sum, a) => sum + a.cnt, 0);
      if (artTotal > 0) lines.push(`  - ${artTotal} active artifact(s)`);
      lines.push('Continue CLAUDE.md lifecycle.');
      console.log(lines.join('\n'));
    }
  } else {
    console.log('[AIDD] No active session found.');
  }
} catch { console.log('[AIDD] No active session found.'); }
