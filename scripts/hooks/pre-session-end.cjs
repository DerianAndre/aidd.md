#!/usr/bin/env node
// AIDD Hook: PreToolUse(mcp__aidd-engine__aidd_session)
// BLOCKS session end if: missing retro OR checklist artifact.
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
    const checklist = db.prepare(
      "SELECT id FROM artifacts WHERE type = 'checklist' AND (status = 'active' OR status = 'done') ORDER BY created_at DESC LIMIT 1"
    ).get();
    const retro = db.prepare(
      "SELECT id FROM artifacts WHERE type = 'retro' AND (status = 'active' OR status = 'done') ORDER BY created_at DESC LIMIT 1"
    ).get();
    db.close();

    const missing = [];
    if (!checklist) missing.push('checklist');
    if (!retro) missing.push('retro');

    if (missing.length > 0) {
      const sid = toolInput.id || 'SESSION_ID';
      const parts = [];

      if (!checklist) {
        parts.push(
          '  aidd_artifact { action: "create", type: "checklist", feature: "session-' + sid.slice(0, 8) + '", ' +
          'title: "Test: <summary>", sessionId: "' + sid + '", ' +
          'content: "- [ ] typecheck\\n- [ ] tests\\n- [ ] build" }'
        );
      }
      if (!retro) {
        parts.push(
          '  aidd_artifact { action: "create", type: "retro", feature: "session-' + sid.slice(0, 8) + '", ' +
          'title: "Retro: <summary>", sessionId: "' + sid + '", ' +
          'content: "## What worked\\n...\\n## What didn\'t\\n...\\n## Lessons\\n..." }'
        );
      }

      process.stderr.write(
        '[AIDD BLOCKED] Cannot end session: missing mandatory artifact(s): ' + missing.join(', ') +
        ' (CLAUDE.md §2.5, §2.7). Create them first:\n' +
        parts.join('\n') + '\n' +
        'Then retry aidd_session { action: "end", ... }.'
      );
      process.exit(2);
    }

    process.exit(0);
  } catch {
    process.exit(0); // Fail-open
  }
});
