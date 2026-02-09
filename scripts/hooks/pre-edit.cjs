#!/usr/bin/env node
// AIDD Hook: PreToolUse(Edit|Write)
// BLOCKS file edits if: no active session, no brainstorm artifact, OR no plan artifact.
// Exceptions: .claude/ paths, scripts/hooks/, .aidd/, memory files.
// Exit 2 + stderr = block. Exit 0 = allow. Fail-open on errors.
const Database = require('better-sqlite3');
const { resolve } = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Exception: framework/config/plan paths — always allow
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
      "SELECT id, data FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1"
    ).get();

    if (!session) {
      db.close();
      process.stderr.write(
        '[AIDD] BLOCKED: No active session. Start one before editing files (CLAUDE.md \u00a71).'
      );
      process.exit(2);
    }

    // Parse session data once
    let sessionData = {};
    if (session.data) {
      try { sessionData = JSON.parse(session.data); } catch { /* safe fallback */ }
    }

    // Validate session is truly active (endedAt must be null)
    if (sessionData.endedAt) {
      db.close();
      process.stderr.write(
        '[AIDD] BLOCKED: Session already ended. Start a new one before editing files (CLAUDE.md \u00a71).'
      );
      process.exit(2);
    }

    // Compute skipped phases from skippableStages or fastTrack default
    const tc = sessionData.taskClassification || {};
    const explicitSkip = Array.isArray(tc.skippableStages) && tc.skippableStages.length > 0
      ? tc.skippableStages
      : null;
    const isFastTrack = tc.fastTrack === true;
    const defaultSkip = ['brainstorm', 'plan', 'checklist'];
    const skipped = explicitSkip || (isFastTrack ? defaultSkip : []);

    // Gate 1: Brainstorm artifact must exist (unless skipped)
    if (!skipped.includes('brainstorm')) {
      const brainstorm = db.prepare(
        "SELECT id FROM artifacts WHERE type = 'brainstorm' AND (status = 'active' OR status = 'done') ORDER BY created_at DESC LIMIT 1"
      ).get();
      if (!brainstorm) {
        db.close();
        process.stderr.write(
          '[AIDD] BLOCKED: Brainstorm required before editing files.\n' +
          '  - Create a brainstorm artifact (CLAUDE.md \u00a72.1)\n' +
          '  - Then create a plan before implementation (\u00a72.2).'
        );
        process.exit(2);
      }
    }

    // Gate 2: Plan artifact must exist (unless skipped)
    if (!skipped.includes('plan')) {
      const plan = db.prepare(
        "SELECT id FROM artifacts WHERE type = 'plan' AND (status = 'active' OR status = 'done') ORDER BY created_at DESC LIMIT 1"
      ).get();
      if (!plan) {
        db.close();
        process.stderr.write(
          '[AIDD] BLOCKED: Plan required before editing files.\n' +
          '  - Create a plan artifact (CLAUDE.md \u00a72.2) before implementation.'
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
