#!/usr/bin/env node
// AIDD Hook: Stop (BLOCKING)
// BLOCKS stop if session still active and workflow incomplete.
// Exit 2 + stderr = block. Exit 0 = allow. Fail-open on errors.
// Adapter-agnostic — referenced by .claude/settings.json and other adapters.
const Database = require('better-sqlite3');
const { resolve } = require('path');
const { isSessionTracking } = require('./lib/config.cjs');
try {
  if (!isSessionTracking()) { process.exit(0); }

  const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });
  const row = db.prepare("SELECT id, data FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get();
  const activeArts = db.prepare("SELECT id, type, title FROM artifacts WHERE status = 'active' ORDER BY type, created_at DESC").all();
  const doneArts = db.prepare("SELECT type FROM artifacts WHERE status = 'done'").all();
  db.close();

  if (!row) {
    process.exit(0);
  }

  const s = JSON.parse(row.data);

  if (s.endedAt) {
    process.exit(0);
  }

  // Compute skipped phases from skippableStages or fastTrack default
  const tc = s.taskClassification || {};
  const explicitSkip = Array.isArray(tc.skippableStages) && tc.skippableStages.length > 0
    ? tc.skippableStages : null;
  const isFastTrack = tc.fastTrack === true;
  const defaultSkip = ['brainstorm', 'plan', 'checklist'];
  const skipped = explicitSkip || (isFastTrack ? defaultSkip : []);

  const allArts = [...activeArts.map(a => a.type), ...doneArts.map(a => a.type)];
  const pendingCount = (s.tasksPending || []).length;

  // Only flag missing artifacts that aren't skipped
  const missing = [];
  if (!skipped.includes('checklist') && !allArts.includes('checklist')) missing.push('checklist');
  if (!skipped.includes('retro') && !allArts.includes('retro')) missing.push('retro');

  const lines = [
    '[AIDD] BLOCKED: Session still active \u2014 complete the end protocol before closing.',
  ];
  if (pendingCount > 0) lines.push(`  - ${pendingCount} pending task(s)`);
  if (activeArts.length > 0) lines.push(`  - ${activeArts.length} artifact(s) need archiving`);
  if (missing.length > 0) lines.push(`  - Missing: ${missing.join(', ')}`);
  lines.push('Complete the Ship step: retro artifact \u2192 archive \u2192 end session.');

  process.stderr.write(lines.join('\n'));
  process.exit(2);
} catch { process.exit(0); /* Fail-open */ }
