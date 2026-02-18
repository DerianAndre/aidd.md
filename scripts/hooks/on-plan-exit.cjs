#!/usr/bin/env node
// AIDD Hook: PostToolUse(ExitPlanMode)
// Provides context after exiting plan mode: plan info, compliance tracking.
// Adapter-agnostic — referenced by .claude/settings.json and other adapters.
const Database = require('better-sqlite3');
const { resolve } = require('path');
const { isSessionTracking } = require('./lib/config.cjs');
try {
  if (!isSessionTracking()) {
    console.log('[AIDD] Workflow-only mode \u2014 no tracking.');
    process.exit(0);
  }

  const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });
  const session = db.prepare("SELECT id, data FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get();
  const plan = db.prepare("SELECT id, title FROM artifacts WHERE type = 'plan' AND status = 'active' ORDER BY created_at DESC LIMIT 1").get();
  db.close();

  const planTitle = plan ? `"${plan.title}"` : 'unknown';

  // Count plan iterations from session decisions
  let iterations = 0;
  if (session) {
    const s = JSON.parse(session.data);
    iterations = (s.decisions || []).filter(d => d.decision && d.decision.includes('Plan rejected')).length;
  }
  const complianceHint = iterations === 0
    ? 'First review \u2014 compliance: 90+'
    : `${iterations} prior rejection(s) \u2014 compliance: ${Math.max(50, 90 - iterations * 15)}`;

  const lines = [
    `[AIDD] Plan reviewed: ${planTitle}. ${complianceHint}.`,
    '  - If approved: archive artifacts, record decision (plan approval protocol)',
    '  - If rejected: record decision, return to brainstorm (\u00a72.1)',
  ];

  console.log(lines.join('\n'));
} catch { console.log('[AIDD] Plan reviewed. Follow approval/rejection protocol (plan approval protocol).'); }
