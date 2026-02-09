#!/usr/bin/env node
// AIDD Hook: PreToolUse(EnterPlanMode)
// BLOCKS plan mode entry if: no active session OR no brainstorm artifact (unless fast-track).
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
      "SELECT id, data FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1"
    ).get();
    if (!session) {
      db.close();
      process.stderr.write(
        '[AIDD BLOCKED] Cannot enter plan mode: no active session. ' +
        'Call aidd_start first (CLAUDE.md §1), then create a brainstorm artifact (§2.1), then retry EnterPlanMode.'
      );
      process.exit(2);
    }

    let isFastTrack = false;
    if (session.data) {
      try {
        const data = JSON.parse(session.data);
        isFastTrack = data.taskClassification && data.taskClassification.fastTrack === true;
      } catch { /* safe fallback */ }
    }

    if (!isFastTrack) {
      const brainstorm = db.prepare(
        "SELECT id FROM artifacts WHERE type = 'brainstorm' AND (status = 'active' OR status = 'done') ORDER BY created_at DESC LIMIT 1"
      ).get();
      if (!brainstorm) {
        db.close();
        const sid = session.id;
        process.stderr.write(
          '[AIDD BLOCKED] Cannot enter plan mode: no brainstorm artifact found (CLAUDE.md §2.1). ' +
          'Create one first:\n' +
          `  aidd_artifact { action: "create", type: "brainstorm", feature: "<slug>", title: "Brainstorm: <topic>", sessionId: "${sid}", content: "## Ideas\\n...\\n## Options\\n...\\n## Trade-offs\\n..." }\n` +
          `  aidd_session { action: "update", id: "${sid}", input: "<refined intent>" }\n` +
          'Then retry EnterPlanMode.'
        );
        process.exit(2);
      }
    }

    db.close();
    process.exit(0);
  } catch {
    process.exit(0); // Fail-open
  }
});
