#!/usr/bin/env node
// AIDD Hook: PreToolUse(EnterPlanMode)
// BLOCKS plan mode entry if: no active session OR no brainstorm artifact (unless skipped).
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
        '[AIDD] BLOCKED: No active session. Start one before entering plan mode (CLAUDE.md \u00a71).'
      );
      process.exit(2);
    }

    // Compute skipped phases
    let skipped = [];
    if (session.data) {
      try {
        const data = JSON.parse(session.data);
        const tc = data.taskClassification || {};
        const explicitSkip = Array.isArray(tc.skippableStages) && tc.skippableStages.length > 0
          ? tc.skippableStages : null;
        const isFastTrack = tc.fastTrack === true;
        const defaultSkip = ['brainstorm', 'plan', 'checklist'];
        skipped = explicitSkip || (isFastTrack ? defaultSkip : []);
      } catch { /* safe fallback */ }
    }

    if (!skipped.includes('brainstorm')) {
      const brainstorm = db.prepare(
        "SELECT id FROM artifacts WHERE type = 'brainstorm' AND (status = 'active' OR status = 'done') ORDER BY created_at DESC LIMIT 1"
      ).get();
      if (!brainstorm) {
        db.close();
        process.stderr.write(
          '[AIDD] BLOCKED: Brainstorm required before planning.\n' +
          '  - Create a brainstorm artifact first (CLAUDE.md \u00a72.1)\n' +
          '  - Then retry entering plan mode.'
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
