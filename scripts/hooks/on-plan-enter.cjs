#!/usr/bin/env node
// AIDD Hook: PostToolUse(EnterPlanMode)
// Enforces: brainstorm artifact MUST exist before planning. Creates plan artifact.
// Fast-track: session taskClassification.fastTrack=true skips brainstorm requirement.
// Adapter-agnostic — referenced by .claude/settings.json and other adapters.
const Database = require('better-sqlite3');
const { resolve } = require('path');
try {
  const db = new Database(resolve('.aidd', 'data.db'), { readonly: true });
  const session = db.prepare("SELECT id, data FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get();
  const brainstorm = db.prepare("SELECT id, title FROM artifacts WHERE type = 'brainstorm' AND (status = 'active' OR status = 'done') ORDER BY created_at DESC LIMIT 1").get();
  const research = db.prepare("SELECT id, title FROM artifacts WHERE type = 'research' AND status = 'active' ORDER BY created_at DESC LIMIT 1").get();
  db.close();
  const sid = session ? session.id : 'SESSION_ID';

  // Fast-track detection: consume persisted policy decision from session data
  let isFastTrack = false;
  if (session && session.data) {
    try {
      const data = JSON.parse(session.data);
      isFastTrack = data.taskClassification && data.taskClassification.fastTrack === true;
    } catch { /* safe fallback: not fast-track */ }
  }

  if (isFastTrack) {
    console.log(
      `[AIDD Workflow §2.2] [Fast-Track] Persisted policy allows brainstorm skip.\n` +
      `Session: "${sid}"\n` +
      `BEFORE writing the plan:\n` +
      `1. aidd_session { action: "update", id: "${sid}", input: "<refined intent>", tasksPending: [...] }\n` +
      `2. aidd_artifact { action: "create", type: "plan", feature: "slug", title: "Plan: ...", sessionId: "${sid}", content: "## Tasks\\n..." }`
    );
  } else {
    const hasBrainstorm = !!brainstorm;
    const brainstormStr = !hasBrainstorm
      ? `\n** WARNING: No brainstorm artifact found! You MUST create one BEFORE writing the plan: **\n` +
        `  aidd_artifact { action: "create", type: "brainstorm", feature: "slug", title: "Brainstorm: ...", sessionId: "${sid}", content: "ideas + options + trade-offs" }\n`
      : `\nBrainstorm: "${brainstorm.title}" (${brainstorm.id})`;

    const researchStr = research ? `\nResearch: "${research.title}" (${research.id})` : '';

    console.log(
      `[AIDD Workflow §2.2] Plan mode entered.${brainstormStr}${researchStr}\n` +
      `BEFORE writing the plan:\n` +
      `1. aidd_session { action: "update", id: "${sid}", input: "<refined intent>", tasksPending: [...] }\n` +
      `2. aidd_artifact { action: "create", type: "plan", feature: "slug", title: "Plan: ...", sessionId: "${sid}", content: "## Tasks\\n..." }\n` +
      `If architecture decisions: aidd_artifact { type: "adr", ... }\n` +
      `If diagrams needed: aidd_artifact { type: "diagram", ... }`
    );
  }
} catch { console.log('[AIDD Workflow §2.2] Plan mode entered. Brainstorm must exist. Create plan artifact.'); }
