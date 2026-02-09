#!/usr/bin/env node
// AIDD Hook: PostToolUse(mcp__aidd-engine__aidd_session)
// Fires after aidd_session calls. On "end" action, verifies test + retro artifacts exist.
// Adapter-agnostic — referenced by .claude/settings.json and other adapters.
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const toolInput = data.tool_input || {};

    // Only act on session end
    if (toolInput.action !== 'end') return;

    const Database = require('better-sqlite3');
    const { resolve } = require('path');
    const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });
    const checklist = db.prepare("SELECT id FROM artifacts WHERE type = 'checklist' AND (status = 'active' OR status = 'done') ORDER BY created_at DESC LIMIT 1").get();
    const retro = db.prepare("SELECT id FROM artifacts WHERE type = 'retro' AND (status = 'active' OR status = 'done') ORDER BY created_at DESC LIMIT 1").get();
    const activeArts = db.prepare("SELECT id, type FROM artifacts WHERE status = 'active'").all();
    let hasTokenTelemetry = false;
    if (toolInput.id) {
      const session = db.prepare("SELECT data FROM sessions WHERE id = ?1").get(toolInput.id);
      if (session && session.data) {
        try {
          const parsed = JSON.parse(session.data);
          hasTokenTelemetry = !!(parsed.tokenUsage && (
            Number(parsed.tokenUsage.inputTokens || 0) > 0 ||
            Number(parsed.tokenUsage.outputTokens || 0) > 0
          ));
        } catch {
          hasTokenTelemetry = false;
        }
      }
    }
    db.close();

    const warnings = [];
    if (!checklist) warnings.push('No checklist artifact — test step may have been skipped');
    if (!retro) warnings.push('No retro artifact — retrospective missing');
    if (activeArts.length > 0) warnings.push(`${activeArts.length} artifact(s) still active — archive them`);
    if (!hasTokenTelemetry) warnings.push('No token telemetry recorded — provide tokenUsage on session end');

    if (warnings.length > 0) {
      console.log(`[AIDD Workflow] Session ending with warnings:\n${warnings.map(w => `  - ${w}`).join('\n')}`);
    }
  } catch { /* silent — non-end actions or parse errors pass through */ }
});
