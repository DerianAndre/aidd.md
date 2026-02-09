#!/usr/bin/env node
// AIDD Hook: PreToolUse(mcp__aidd-engine__aidd_session)
// BLOCKS session end if: missing required artifacts (respects skippableStages).
// Only fires for action === "end". All other actions pass through.
// Exit 2 + stderr = block. Exit 0 = allow. Fail-open on errors.
const Database = require('better-sqlite3');
const { resolve } = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const toolInput = data.tool_input || {};

    // Only enforce on session end
    if (toolInput.action !== 'end') {
      process.exit(0);
    }

    const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });

    // Compute skipped phases from session data
    let skipped = [];
    if (toolInput.id) {
      const session = db.prepare("SELECT data FROM sessions WHERE id = ?1").get(toolInput.id);
      if (session && session.data) {
        try {
          const s = JSON.parse(session.data);
          const tc = s.taskClassification || {};
          const explicitSkip = Array.isArray(tc.skippableStages) && tc.skippableStages.length > 0
            ? tc.skippableStages : null;
          const isFastTrack = tc.fastTrack === true;
          const defaultSkip = ['brainstorm', 'plan', 'checklist'];
          skipped = explicitSkip || (isFastTrack ? defaultSkip : []);
        } catch { /* safe fallback */ }
      }
    }

    // Only require artifacts that aren't skipped
    const missing = [];
    if (!skipped.includes('checklist')) {
      const checklist = db.prepare(
        "SELECT id FROM artifacts WHERE type = 'checklist' AND (status = 'active' OR status = 'done') ORDER BY created_at DESC LIMIT 1"
      ).get();
      if (!checklist) missing.push('checklist');
    }
    if (!skipped.includes('retro')) {
      const retro = db.prepare(
        "SELECT id FROM artifacts WHERE type = 'retro' AND (status = 'active' OR status = 'done') ORDER BY created_at DESC LIMIT 1"
      ).get();
      if (!retro) missing.push('retro');
    }
    db.close();

    if (missing.length > 0) {
      process.stderr.write(
        '[AIDD] BLOCKED: Cannot end session \u2014 missing required artifacts: ' + missing.join(', ') + '.\n' +
        '  - Create them before ending (CLAUDE.md \u00a72.5, \u00a72.7).'
      );
      process.exit(2);
    }

    process.exit(0);
  } catch {
    process.exit(0); // Fail-open
  }
});
