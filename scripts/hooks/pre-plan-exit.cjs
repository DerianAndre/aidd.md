#!/usr/bin/env node
// AIDD Hook: PreToolUse(ExitPlanMode)
// BLOCKS plan mode exit if: no active plan artifact exists.
// Exit 2 + stderr = block. Exit 0 = allow. Fail-open on DB errors.
const Database = require('better-sqlite3');
const { resolve } = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  try {
    const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });
    const session = db.prepare(
      "SELECT id FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1"
    ).get();
    const plan = db.prepare(
      "SELECT id FROM artifacts WHERE type = 'plan' AND status = 'active' ORDER BY created_at DESC LIMIT 1"
    ).get();
    db.close();

    if (!plan) {
      const sid = session ? session.id : 'SESSION_ID';
      process.stderr.write(
        '[AIDD BLOCKED] Cannot exit plan mode: no active plan artifact found (CLAUDE.md §2.2). ' +
        'Create one first:\n' +
        `  aidd_artifact { action: "create", type: "plan", feature: "<slug>", title: "Plan: <feature>", sessionId: "${sid}", content: "## Tasks\\n..." }\n` +
        'Then retry ExitPlanMode.'
      );
      process.exit(2);
    }

    process.exit(0);
  } catch {
    process.exit(0); // Fail-open
  }
});
