#!/usr/bin/env node
// AIDD Hook: PostToolUse(EnterPlanMode)
// Provides context after entering plan mode: brainstorm status, research artifacts.
// Uses skippableStages to determine if brainstorm was intentionally skipped.
// Adapter-agnostic — referenced by .claude/settings.json and other adapters.
const Database = require('better-sqlite3');
const { resolve } = require('path');
try {
  const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });
  const session = db.prepare("SELECT id, data FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get();
  const brainstorm = db.prepare("SELECT id, title FROM artifacts WHERE type = 'brainstorm' AND (status = 'active' OR status = 'done') ORDER BY created_at DESC LIMIT 1").get();
  const research = db.prepare("SELECT id, title FROM artifacts WHERE type = 'research' AND status = 'active' ORDER BY created_at DESC LIMIT 1").get();
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

  const lines = ['[AIDD] Plan mode entered.'];
  if (brainstorm) {
    lines.push(`  - Brainstorm: "${brainstorm.title}"`);
  } else if (skipped.includes('brainstorm')) {
    lines.push('  - Brainstorm: skipped (fast-track)');
  } else {
    lines.push('  - WARNING: No brainstorm artifact found (BAP step 1)');
  }
  if (research) lines.push(`  - Research: "${research.title}"`);
  lines.push('Create a plan artifact (BAP \u2192 Plan).');

  console.log(lines.join('\n'));
} catch { console.log('[AIDD] Plan mode entered. Create a plan artifact (BAP \u2192 Plan).'); }
