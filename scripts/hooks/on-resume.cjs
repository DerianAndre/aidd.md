#!/usr/bin/env node
// AIDD Hook: SessionStart(resume|compact|clear)
// Recovers session context with task counts + active artifact summary.
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
    const artStr = arts.length ? ` Artifacts: ${arts.map(a => `${a.cnt} ${a.type}`).join(', ')}.` : '';
    console.log(`[AIDD] Context recovered. Session: ${row.id} (branch: ${row.branch}). Input: "${s.input || 'unknown'}". Tasks: ${(s.tasksCompleted || []).length} done, ${(s.tasksPending || []).length} pending.${artStr} Continue CLAUDE.md lifecycle.`);
  } else {
    console.log('[AIDD] Context recovered, no active session. Recover: aidd_session { action: "list", status: "active" }.');
  }
} catch { console.log('[AIDD] Context recovered. Recover session: aidd_session { action: "list", status: "active" }.'); }
