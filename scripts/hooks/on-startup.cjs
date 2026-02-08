#!/usr/bin/env node
// AIDD Hook: SessionStart(startup)
// Queries .aidd/data.db for active session + orphaned artifacts.
// Adapter-agnostic — referenced by .claude/settings.json and other adapters.
const Database = require('better-sqlite3');
const { resolve } = require('path');
try {
  const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });
  const session = db.prepare("SELECT id, branch, data FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get();
  const arts = db.prepare("SELECT type, count(*) as cnt FROM artifacts WHERE status = 'active' GROUP BY type").all();
  db.close();
  if (session) {
    const s = JSON.parse(session.data);
    const input = s.input ? ` Input: "${s.input}".` : '';
    const artStr = arts.length ? ` Active artifacts: ${arts.map(a => `${a.cnt} ${a.type}`).join(', ')}.` : '';
    console.log(`[AIDD] Active session: ${session.id} (branch: ${session.branch}).${input}${artStr} Resume or end it. Workflow: Brainstorm → Plan → Execute → Review → End (CLAUDE.md §2).`);
  } else {
    const artStr = arts.length ? ` Warning: ${arts.reduce((s, a) => s + a.cnt, 0)} orphaned active artifacts found — archive or review them.` : '';
    console.log(`[AIDD] No active session.${artStr} Call aidd_start NOW. Mandatory workflow: Brainstorm → Plan → Execute → Review → End (CLAUDE.md §2).`);
  }
} catch { console.log('[AIDD] Call aidd_start NOW. Mandatory workflow: Brainstorm → Plan → Execute → Review → End (CLAUDE.md §2).'); }
