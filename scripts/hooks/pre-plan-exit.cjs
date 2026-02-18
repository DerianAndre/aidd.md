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
    const plan = db.prepare(
      "SELECT id FROM artifacts WHERE type = 'plan' AND status = 'active' ORDER BY created_at DESC LIMIT 1"
    ).get();
    db.close();

    if (!plan) {
      process.stderr.write(
        '[AIDD] BLOCKED: No plan artifact found.\n' +
        '  - Write a plan artifact (BAP \u2192 Plan) before exiting plan mode.'
      );
      process.exit(2);
    }

    process.exit(0);
  } catch {
    process.exit(0); // Fail-open
  }
});
