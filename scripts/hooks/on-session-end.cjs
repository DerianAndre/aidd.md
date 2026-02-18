#!/usr/bin/env node
// AIDD Hook: PostToolUse(mcp__aidd-engine__aidd_session)
// Fires after aidd_session calls. On "end" action, verifies artifacts + telemetry.
// Respects skippableStages for artifact warnings.
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

    const { isSessionTracking } = require('./lib/config.cjs');
    if (!isSessionTracking()) {
      console.log('[AIDD] Workflow-only mode \u2014 no tracking.');
      return;
    }

    const Database = require('better-sqlite3');
    const { resolve } = require('path');
    const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });

    // Compute skipped phases from session data
    let skipped = [];
    let hasTokenTelemetry = false;
    if (toolInput.id) {
      const session = db.prepare("SELECT data FROM sessions WHERE id = ?1").get(toolInput.id);
      if (session && session.data) {
        try {
          const parsed = JSON.parse(session.data);
          const tc = parsed.taskClassification || {};
          const explicitSkip = Array.isArray(tc.skippableStages) && tc.skippableStages.length > 0
            ? tc.skippableStages : null;
          const isFastTrack = tc.fastTrack === true;
          const defaultSkip = ['brainstorm', 'plan', 'checklist'];
          skipped = explicitSkip || (isFastTrack ? defaultSkip : []);
          hasTokenTelemetry = !!(parsed.tokenUsage && (
            Number(parsed.tokenUsage.inputTokens || 0) > 0 ||
            Number(parsed.tokenUsage.outputTokens || 0) > 0
          ));
        } catch { /* safe fallback */ }
      }
    }

    const checklist = db.prepare("SELECT id FROM artifacts WHERE session_id = ?1 AND type = 'checklist' AND (status = 'active' OR status = 'done') ORDER BY created_at DESC LIMIT 1").get(toolInput.id);
    const retro = db.prepare("SELECT id FROM artifacts WHERE session_id = ?1 AND type = 'retro' AND (status = 'active' OR status = 'done') ORDER BY created_at DESC LIMIT 1").get(toolInput.id);
    const activeArts = db.prepare("SELECT id, type FROM artifacts WHERE session_id = ?1 AND status = 'active'").all(toolInput.id);
    db.close();

    const warnings = [];
    if (!skipped.includes('checklist') && !checklist) warnings.push('No checklist artifact');
    if (!skipped.includes('retro') && !retro) warnings.push('No retro artifact');
    if (activeArts.length > 0) warnings.push(`${activeArts.length} artifact(s) still active`);
    if (!hasTokenTelemetry) warnings.push('No token telemetry recorded');

    if (warnings.length > 0) {
      console.log(`[AIDD] Session ending with warnings:\n${warnings.map(w => `  - ${w}`).join('\n')}`);
    }
  } catch { /* silent — non-end actions or parse errors pass through */ }
});
