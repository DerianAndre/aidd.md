#!/usr/bin/env node
// AIDD Hook: PostToolUse(ExitPlanMode)
// Enforces approval/rejection protocol + compliance tracking via iteration count.
// Adapter-agnostic — referenced by .claude/settings.json and other adapters.
const Database = require('better-sqlite3');
const { resolve } = require('path');
try {
  const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });
  const session = db.prepare("SELECT id, data FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get();
  const plan = db.prepare("SELECT id, title FROM artifacts WHERE type = 'plan' AND status = 'active' ORDER BY created_at DESC LIMIT 1").get();
  const activeArts = db.prepare("SELECT id, type, title FROM artifacts WHERE status = 'active' AND type != 'plan' ORDER BY created_at DESC").all();
  db.close();
  const sid = session ? session.id : 'SESSION_ID';
  const pid = plan ? plan.id : 'PLAN_ARTIFACT_ID';
  const planTitle = plan ? ` "${plan.title}"` : '';

  // Count plan iterations from session decisions
  let iterations = 0;
  if (session) {
    const s = JSON.parse(session.data);
    iterations = (s.decisions || []).filter(d => d.decision && d.decision.includes('Plan rejected')).length;
  }
  const complianceHint = iterations === 0
    ? 'First review — if approved, complianceScore: 90+'
    : `${iterations} prior rejection(s) — complianceScore: ${Math.max(50, 90 - iterations * 15)}`;

  const otherArts = activeArts.length
    ? `\nActive artifacts: ${activeArts.map(a => `${a.type}:${a.id}`).join(', ')}`
    : '';

  console.log(
    `[AIDD Workflow §2.3] Plan${planTitle} (${pid}) reviewed. ${complianceHint}.${otherArts}\n` +
    `IF APPROVED:\n` +
    `  1. aidd_artifact { action: "archive", id: "${pid}" }\n` +
    `  2. Archive brainstorm/research: aidd_artifact { action: "archive", id: "..." }\n` +
    `  3. aidd_session { action: "update", id: "${sid}", decisions: [{ decision: "Plan approved: ...", reasoning: "User confirmed", timestamp: NOW }] }\n` +
    `  4. aidd_observation { sessionId: "${sid}", type: "decision", title: "Plan approved: <feature>" }\n` +
    `  5. If spec needed: aidd_artifact { type: "spec", ... }\n` +
    `  6. If framework content: aidd_draft_create { ... }\n` +
    `  7. If arch decision: aidd_artifact { type: "adr", ... }\n` +
    `IF REJECTED (iteration ${iterations + 1}):\n` +
    `  1. aidd_session { action: "update", id: "${sid}", decisions: [{ decision: "Plan rejected: <reason>", reasoning: "...", timestamp: NOW }] }\n` +
    `  2. aidd_observation { sessionId: "${sid}", type: "decision", title: "Plan rejected: <reason>" }\n` +
    `  3. Update plan: aidd_artifact { action: "update", id: "${pid}", content: "revised" }\n` +
    `  4. Return to brainstorming if approach changes fundamentally.`
  );
} catch { console.log('[AIDD Workflow §2.3] Plan reviewed. Follow approval/rejection protocol.'); }
