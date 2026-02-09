#!/usr/bin/env node
// AIDD Hook: Stop
// Enforces mandatory workflow completion: test (checklist) + review + retro + artifact archival + session end.
// Adapter-agnostic — referenced by .claude/settings.json and other adapters.
const Database = require('better-sqlite3');
const { resolve } = require('path');
try {
  const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });
  const row = db.prepare("SELECT id, data FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get();
  const activeArts = db.prepare("SELECT id, type, title FROM artifacts WHERE status = 'active' ORDER BY type, created_at DESC").all();
  const doneArts = db.prepare("SELECT type FROM artifacts WHERE status = 'done'").all();
  db.close();
  if (row) {
    const s = JSON.parse(row.data);
    const artList = activeArts.length
      ? `\nActive artifacts to archive:\n${activeArts.map(a => `  - ${a.type}: "${a.title}" (${a.id})`).join('\n')}`
      : '';

    // Check workflow completeness
    const allArts = [...activeArts.map(a => a.type), ...doneArts.map(a => a.type)];
    const hasRetro = allArts.includes('retro');
    const hasChecklist = allArts.includes('checklist');
    const hasBrainstorm = allArts.includes('brainstorm');
    const hasPlan = allArts.includes('plan');
    const hasTokenUsage = !!(s && s.tokenUsage && (
      Number(s.tokenUsage.inputTokens || 0) > 0 || Number(s.tokenUsage.outputTokens || 0) > 0
    ));

    const missing = [];
    if (!hasChecklist) missing.push('checklist (TEST — automated checks)');
    if (!hasRetro) missing.push('retro (SHIP — retrospective)');
    if (!hasTokenUsage) missing.push('token telemetry (inputTokens/outputTokens)');
    const missingStr = missing.length
      ? `\n** Missing workflow requirements: ${missing.join(', ')} — complete them before ending **`
      : '';

    // Compliance hint
    const workflowSteps = [hasBrainstorm, hasPlan, hasChecklist, hasRetro].filter(Boolean).length;
    const complianceHint = `\nWorkflow completeness: ${workflowSteps}/4 steps (brainstorm, plan, test, retro)`;

    const retroReminder = !hasRetro
      ? `\nCreate retro: aidd_artifact { action: "create", type: "retro", feature: "session-${row.id.slice(0, 8)}", title: "Retro: <summary>", sessionId: "${row.id}", content: "## What worked\\n...\\n## What didn't\\n...\\n## Lessons\\n..." }`
      : '';

    const checklistReminder = !hasChecklist
      ? `\nCreate checklist: aidd_artifact { action: "create", type: "checklist", feature: "session-${row.id.slice(0, 8)}", title: "Test: <summary>", sessionId: "${row.id}", content: "- [ ] typecheck\\n- [ ] tests\\n- [ ] build\\n- [ ] lint" }`
      : '';

    console.log(
      `[AIDD Workflow §2.7] Session ${row.id} STILL ACTIVE (${(s.tasksPending || []).length} pending).${artList}${missingStr}${complianceHint}${checklistReminder}${retroReminder}\n` +
      `Complete the Session End Protocol:\n` +
      `1. aidd_session { action: "update", id: "${row.id}", tasksCompleted: [...], filesModified: [...], output: "summary" }\n` +
      `2. aidd_observation for each significant learning\n` +
      `3. aidd_memory_add_decision / _mistake / _convention for cross-session knowledge\n` +
      `4. Create checklist artifact (if not created) — test step\n` +
      `5. Create retro artifact (if not created) — retrospective\n` +
      `6. Archive ALL active artifacts: aidd_artifact { action: "archive", id: "..." } for each\n` +
      `7. aidd_memory_export (if decisions/mistakes were recorded)\n` +
      `8. aidd_session { action: "end", id: "${row.id}", tokenUsage: { inputTokens: <n>, outputTokens: <n> }, outcome: { testsPassing, complianceScore, reverts, reworks } }`
    );
  }
} catch { /* silent */ }
