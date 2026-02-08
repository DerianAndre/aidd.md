#!/usr/bin/env node
// AIDD Hook: PostToolUse(mcp__aidd-engine__aidd_start)
// Fires after aidd_start. Enforces mandatory brainstorm as first workflow step.
// Reads stdin for tool context. Adapter-agnostic.
const Database = require('better-sqlite3');
const { resolve } = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  try {
    const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });
    const session = db.prepare("SELECT id FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get();
    const brainstorm = db.prepare("SELECT id FROM artifacts WHERE type = 'brainstorm' AND status = 'active' ORDER BY created_at DESC LIMIT 1").get();
    db.close();
    const sid = session ? session.id : 'SESSION_ID';
    if (brainstorm) {
      console.log(`[AIDD Workflow §2.1] Session ${sid} initialized. Active brainstorm: ${brainstorm.id}. Continue to planning (EnterPlanMode) when ready.`);
    } else {
      console.log(
        `[AIDD Workflow §2.1] Session ${sid} initialized. MANDATORY next step: Brainstorm.\n` +
        `You MUST create a brainstorm artifact BEFORE any planning or implementation:\n` +
        `  aidd_artifact { action: "create", type: "brainstorm", feature: "<slug>", title: "Brainstorm: <topic>", sessionId: "${sid}", content: "## Ideas\\n...\\n## Options\\n...\\n## Trade-offs\\n..." }\n` +
        `  aidd_session { action: "update", id: "${sid}", input: "<refined user intent>" }\n` +
        `Skip ONLY if user EXPLICITLY requested no brainstorm.`
      );
    }
  } catch {
    console.log('[AIDD Workflow §2.1] Session initialized. Create brainstorm artifact before planning (mandatory unless user opts out).');
  }
});
