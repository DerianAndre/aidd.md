#!/usr/bin/env node
// AIDD Hook: PreCompact
// Warns with specific session state and active artifact count before context compaction.
// Adapter-agnostic — referenced by .claude/settings.json and other adapters.
const Database = require('better-sqlite3');
const { resolve } = require('path');
const { isSessionTracking } = require('./lib/config.cjs');
try {
  if (!isSessionTracking()) {
    console.log('[AIDD] Workflow-only mode \u2014 no tracking.');
    process.exit(0);
  }

  const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });
  const row = db.prepare("SELECT id, data FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get();
  const artCount = db.prepare("SELECT count(*) as cnt FROM artifacts WHERE status = 'active'").get();
  db.close();
  if (row) {
    const s = JSON.parse(row.data);
    const ac = artCount ? artCount.cnt : 0;
    const lines = ['[AIDD] Context compaction imminent.'];
    lines.push(`  - Session ${row.id}: ${(s.tasksCompleted || []).length} completed, ${(s.tasksPending || []).length} pending, ${(s.filesModified || []).length} files, ${ac} artifact(s)`);
    lines.push('Save session state now (Ship step).');
    console.log(lines.join('\n'));
  }
} catch { console.log('[AIDD] Context compaction imminent. Save session state now (Ship step).'); }
