#!/usr/bin/env node
// AIDD Hook: PostToolUse(mcp__aidd-engine__aidd_start)
// Fires after aidd_start. Enforces brainstorm unless skipped via skippableStages/fastTrack.
// Reads stdin for tool context. Adapter-agnostic.
const Database = require('better-sqlite3');
const { resolve } = require('path');
const { isSessionTracking } = require('./lib/config.cjs');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  try {
    if (!isSessionTracking()) {
      console.log('[AIDD] Workflow-only mode \u2014 no tracking.');
      return;
    }
    const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });
    const session = db.prepare("SELECT id, data FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get();
    const brainstorm = db.prepare("SELECT id FROM artifacts WHERE type = 'brainstorm' AND status = 'active' ORDER BY created_at DESC LIMIT 1").get();
    db.close();

    // Compute skipped phases
    let skipped = [];
    if (session && session.data) {
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

    if (skipped.includes('brainstorm')) {
      console.log(
        '[AIDD] Session initialized. Brainstorm skipped (fast-track).\n' +
        'Proceed to planning when ready (BAP \u2192 Plan).'
      );
      return;
    }

    if (brainstorm) {
      console.log(
        '[AIDD] Session initialized. Brainstorm exists.\n' +
        'Proceed to planning when ready (BAP \u2192 Plan).'
      );
    } else {
      console.log(
        '[AIDD] Session initialized. Next: brainstorm (BAP step 1).\n' +
        '  - Explore the problem space and ask questions\n' +
        '  - Create a brainstorm artifact\n' +
        '  - Skip only if user explicitly opts out.'
      );
    }
  } catch {
    console.log('[AIDD] Session initialized. Next: brainstorm (BAP step 1).');
  }
});
