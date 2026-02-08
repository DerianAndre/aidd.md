#!/usr/bin/env node
// AIDD Hook: PreCompact
// Warns with specific session state and active artifact count before context compaction.
// Adapter-agnostic — referenced by .claude/settings.json and other adapters.
const Database = require('better-sqlite3');
const { resolve } = require('path');
try {
  const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });
  const row = db.prepare("SELECT id, data FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get();
  const artCount = db.prepare("SELECT count(*) as cnt FROM artifacts WHERE status = 'active'").get();
  db.close();
  if (row) {
    const s = JSON.parse(row.data);
    const ac = artCount ? artCount.cnt : 0;
    console.log(`[AIDD] Compaction imminent. Session ${row.id}: ${(s.tasksCompleted || []).length} completed, ${(s.tasksPending || []).length} pending, ${(s.filesModified || []).length} files, ${ac} active artifacts. Call aidd_session { action: "update", id: "${row.id}" } NOW to save state.`);
  }
} catch { console.log('[AIDD] Compaction imminent. Save state: aidd_session { action: "update" } NOW.'); }
