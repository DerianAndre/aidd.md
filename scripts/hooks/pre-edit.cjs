#!/usr/bin/env node
// AIDD Hook: PreToolUse(Edit|Write)
// BLOCKS file edits if: no active session (aidd_start not called).
// Exceptions: plan mode, .claude/ paths, scripts/hooks/ paths, memory files.
// Exit 2 + stderr = block. Exit 0 = allow. Fail-open on errors.
const Database = require('better-sqlite3');
const { resolve } = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Exception: plan mode — always allow (plan mode writes plan files)
    if (data.permission_mode === 'plan') {
      process.exit(0);
    }

    // Exception: framework/config paths — always allow
    const filePath = (data.tool_input && data.tool_input.file_path) || '';
    const normalized = filePath.replace(/\\/g, '/');
    if (
      normalized.includes('.claude/') ||
      normalized.includes('scripts/hooks/') ||
      normalized.includes('.aidd/') ||
      normalized.includes('/memory/MEMORY.md')
    ) {
      process.exit(0);
    }

    // Main check: active session must exist
    const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });
    const session = db.prepare(
      "SELECT id FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1"
    ).get();
    db.close();

    if (!session) {
      process.stderr.write(
        '[AIDD BLOCKED] Cannot edit/write files: no active session. ' +
        'Call aidd_start first (CLAUDE.md §1), then complete brainstorm (§2.1) and planning (§2.2) before implementation.'
      );
      process.exit(2);
    }

    process.exit(0);
  } catch {
    process.exit(0); // Fail-open
  }
});
