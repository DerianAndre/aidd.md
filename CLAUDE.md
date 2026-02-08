# AIDD — Project Instructions for Claude Code

> AI-Driven Development Framework — MCP Ecosystem
> **Last Updated**: 2026-02-08

---

## 1. Startup Protocol

**MANDATORY — FIRST action in EVERY conversation, no exceptions.**

Call `aidd_start` immediately. Do NOT read files, search code, or begin any work until this completes.

| Parameter            | Value                                                         |
| -------------------- | ------------------------------------------------------------- |
| `aiProvider`         | `{ provider, model, modelId, client }` — your model info      |
| `taskClassification` | `{ domain, nature, complexity }` — if known from user request |
| `branch`             | Auto-detected or user-specified                               |
| `memorySessionId`    | For cross-session continuity (if provided)                    |

This returns: session context + framework rules + active agents + suggested next steps.
**Store the session ID returned by `aidd_start`. You need it for ALL subsequent operations.**

**Immediately after `aidd_start`:** Set the raw session input:
`aidd_session { action: "update", id: SESSION_ID, input: "user's raw request" }`

**Hook `on-session-init.cjs` fires after `aidd_start`** — it enforces the mandatory brainstorm step (§2.1).

**Fallback** (MCP unavailable): Run `pnpm mcp:check` in the terminal.

Expected status:
- `[aidd.md] Engine - ON` — All MCP packages built and ready
- `[aidd.md] Engine - PARTIAL` — Some packages need rebuilding
- `[aidd.md] Engine - OFF` — Setup required

---

## 2. Mandatory Workflow Pipeline

**Every session follows this pipeline. No step is optional unless the user EXPLICITLY opts out.**

```
User Input → Brainstorm → Planning → [Iterate] → Approved → Execution → Review → Ending
    │            │            │           │            │           │          │         │
    ▼            ▼            ▼           ▼            ▼           ▼          ▼         ▼
 session    brainstorm      plan      plan(v2)     archive     issue/    checklist    retro
 created    artifact      artifact    artifact    +spec/adr   artifact   artifact   artifact
    │            │            │           │            │           │          │         │
    ▼            ▼            ▼           ▼            ▼           ▼          ▼         ▼
 session     session      session     session      session    session    session    session
 update      update       update      update       update     update     update      end
```

**Escape hatch**: User EXPLICITLY says "skip brainstorm", "just implement this", or similar direct opt-out.

### 2.1 UNDERSTAND — Brainstorm

**MANDATORY. Hook `on-session-init.cjs` enforces this after `aidd_start`.**
**Skip ONLY if user EXPLICITLY requests it (e.g., "skip brainstorm", "just implement").**

After `aidd_start` and setting raw input, your FIRST action is brainstorming:

1. Search memory for prior context: `aidd_memory_search { query: "relevant topic" }`
2. Explore the problem space — read code, investigate options, consider trade-offs
3. Create brainstorm artifact:
   ```
   aidd_artifact { action: "create", type: "brainstorm", feature: "<slug>", title: "Brainstorm: <topic>", sessionId: SESSION_ID, content: "## Ideas\n...\n## Options\n...\n## Trade-offs\n..." }
   ```
4. If research was needed, also create:
   ```
   aidd_artifact { action: "create", type: "research", feature: "<slug>", title: "Research: <topic>", sessionId: SESSION_ID, content: "## Findings\n..." }
   ```
5. Update session with refined understanding:
   ```
   aidd_session { action: "update", id: SESSION_ID, input: "<refined intent after brainstorming>" }
   ```

**Compliance**: Brainstorm artifact existence is checked by `on-plan-enter.cjs`. Missing it triggers a WARNING.

### 2.2 PLAN — Create Plan

**MANDATORY. Enter plan mode (`EnterPlanMode`). Hook `on-plan-enter.cjs` verifies brainstorm exists.**

1. Enter plan mode
2. Hook fires — checks brainstorm artifact exists, provides session/artifact IDs
3. Update session with refined context:
   ```
   aidd_session { action: "update", id: SESSION_ID, input: "<refined intent>", tasksPending: [...] }
   ```
4. Create plan artifact (**mandatory**):
   ```
   aidd_artifact { action: "create", type: "plan", feature: "<slug>", title: "Plan: <feature>", sessionId: SESSION_ID, content: "## Tasks\n..." }
   ```
5. If architecture decisions: `aidd_artifact { type: "adr", ... }`
6. If diagrams needed: `aidd_artifact { type: "diagram", ... }`

### 2.3 PLAN — Plan Review

**Exit plan mode (`ExitPlanMode`). Hook `on-plan-exit.cjs` provides compliance tracking.**

#### On Approval (hook provides exact IDs):

1. Archive plan: `aidd_artifact { action: "archive", id: PLAN_ARTIFACT_ID }`
2. Archive brainstorm/research artifacts: `aidd_artifact { action: "archive", id: "..." }` for each
3. Update session with approval decision:
   `aidd_session { action: "update", id: SESSION_ID, decisions: [{ decision: "Plan approved: <feature>", reasoning: "User confirmed", timestamp: "..." }] }`
4. Record observation: `aidd_observation { sessionId: SESSION_ID, type: "decision", title: "Plan approved: <feature>" }`
5. If spec needed: `aidd_artifact { type: "spec", ... }`
6. If framework content changes: `aidd_draft_create { category: "rules|knowledge|skills|workflows", title, filename, content, confidence: 70 }`
7. If arch decision: `aidd_artifact { type: "adr", ... }`

#### On Rejection (iterate):

1. Update session with rejection decision + reasoning:
   `aidd_session { action: "update", id: SESSION_ID, decisions: [{ decision: "Plan rejected: <reason>", reasoning: "...", timestamp: "..." }] }`
2. Record observation: `aidd_observation { sessionId: SESSION_ID, type: "decision", title: "Plan rejected: <reason>" }`
3. Update plan artifact with revisions: `aidd_artifact { action: "update", id: PLAN_ARTIFACT_ID, content: "revised" }`
4. Return to brainstorming if approach changes fundamentally
5. Re-enter plan mode for next iteration

**Compliance**: First-try approval → complianceScore 90+. Each rejection → -15 points.

### 2.4 BUILD — Execution

**Implement the approved plan.**

1. Follow the approved plan's task list
2. Update session at task boundaries:
   `aidd_session { action: "update", id: SESSION_ID, tasksCompleted: [...], filesModified: [...] }`
3. Record observations for significant learnings:
   `aidd_observation { sessionId: SESSION_ID, type: "<type>", title: "..." }`
4. If bugs/blockers found: `aidd_artifact { type: "issue", ... }`
5. For errors, check known fixes first: `aidd_diagnose_error { error: "..." }`

### 2.5 VERIFY — Review

**MANDATORY. Create a checklist artifact tracking verification steps.**
**Hook `on-stop.cjs` checks for checklist artifact before allowing session end.**

1. Create checklist artifact:
   ```
   aidd_artifact { action: "create", type: "checklist", feature: "<slug>", title: "Review: <feature>", sessionId: SESSION_ID, content: "- [ ] typecheck\n- [ ] tests\n- [ ] lint\n- [ ] spec alignment\n- [ ] no regressions" }
   ```
2. Run verification (typecheck, tests, build as appropriate)
3. Update checklist with results: `aidd_artifact { action: "update", id: CHECKLIST_ID, content: "updated results" }`
4. Archive checklist when complete: `aidd_artifact { action: "archive", id: CHECKLIST_ID }`

**Compliance**: Checklist artifact existence contributes to workflow completeness score (X/4 steps).

### 2.6 SHIP — Session End

**MANDATORY 7-step protocol. Hook `on-stop.cjs` blocks with exact instructions if incomplete.**

**Step 1 — Final session update:**
`aidd_session { action: "update", id: SESSION_ID, tasksCompleted: [...], filesModified: [...], output: "brief summary of all work done" }`

**Step 2 — Record observations** (skip if none):
`aidd_observation { sessionId: SESSION_ID, type, title }` for each significant learning.

**Step 3 — Write permanent memory** (skip if nothing cross-session significant):
- `aidd_memory_add_decision { decision, reasoning }` — for architectural/tech decisions
- `aidd_memory_add_mistake { error, rootCause, fix, prevention }` — for non-obvious bugs
- `aidd_memory_add_convention { convention, example }` — for project patterns discovered

**Step 4 — Create retro artifact:**
```
aidd_artifact { action: "create", type: "retro", feature: "session-<short-id>", title: "Retro: <session-summary>", sessionId: SESSION_ID, content: "## What worked\n...\n## What didn't\n...\n## Lessons learned\n..." }
```

**Step 5 — Archive ALL active artifacts:**
`aidd_artifact { action: "archive", id: ARTIFACT_ID }` for each active artifact.

**Step 6 — Export memory** (if decisions/mistakes recorded in Steps 2-3):
`aidd_memory_export`

**Step 7 — Close session:**
```
aidd_session { action: "end", id: SESSION_ID, output: "summary", outcome: { testsPassing: true|false, complianceScore: 0-100, reverts: 0, reworks: 0, userFeedback: "positive"|"neutral"|"negative" } }
```

**Hook `on-session-end.cjs` fires after Step 7** — verifies checklist + retro artifacts exist, warns about active artifacts.

**Server-side auto-hooks fire after Step 7 (zero token cost):**
Model fingerprint, pattern profiling, evolution analysis (5th session), data pruning (10th session).

---

## 3. Operations Reference

**Supporting operations used within the workflow pipeline above.**

### 3.1 Session Updates

Call `aidd_session { action: "update", id: SESSION_ID }` at workflow transitions and task boundaries.

**MUST update after:**
- Completing a task group → append `tasksCompleted`, `filesModified`
- Starting new tasks → set `tasksPending`
- Making a significant decision → append `decisions`
- Resolving an error or bug → append `errorsResolved`

**DO NOT update after:**
- Every individual file read or write
- Routine operations following existing patterns
- Trivial mechanical changes

### 3.2 Observations

Call `aidd_observation { sessionId: SESSION_ID, type, title }` when significant learnings occur.

| Event                           | Type               |
| ------------------------------- | ------------------ |
| Architectural decision made     | `decision`         |
| Non-obvious bug found and fixed | `mistake`          |
| Project convention identified   | `convention`       |
| Recurring codebase pattern      | `pattern`          |
| External tool gave key info     | `tool_outcome`     |
| Multi-step workflow completed   | `workflow_outcome` |
| User preference expressed       | `preference`       |
| Cross-concept connection found  | `insight`          |

**DO NOT observe:** routine implementation, trivial fixes, obvious decisions.

### 3.3 Memory Operations

**BEFORE planning (§2.1):** ALWAYS search memory first.

```
aidd_memory_search { query: "relevant topic" }
→ aidd_memory_context { anchor: "<id>" }     // if timeline needed
→ aidd_memory_get { ids: ["<id1>", "<id2>"] } // for full details
```

**AFTER significant work (§2.6):** Write permanent memory.
- Decisions: `aidd_memory_add_decision { decision, reasoning }`
- Mistakes: `aidd_memory_add_mistake { error, rootCause, fix, prevention }`
- Conventions: `aidd_memory_add_convention { convention, example }`

**Before creating a PR:** Export memory for Git visibility: `aidd_memory_export`

### 3.4 Artifacts

**Artifacts are versioned documents created at specific workflow steps.**
**Status: `active` = draft/in-progress, `done` = completed/approved (via `archive` action).**

| Workflow Step | Artifact Type | When |
|---------------|--------------|------|
| §2.1 UNDERSTAND | `brainstorm` | After exploring ideas, options, trade-offs |
| §2.1 UNDERSTAND | `research` | After investigating tech, patterns, prior art |
| §2.2 PLAN | `plan` | When entering plan mode |
| §2.2 PLAN | `adr` | Architecture decisions with trade-offs |
| §2.2 PLAN | `diagram` | System/component/flow diagrams |
| §2.3 PLAN | `spec` | Formal specification with acceptance criteria |
| §2.4 BUILD | `issue` | Bugs, blockers, problems discovered |
| §2.5 VERIFY | `checklist` | Verification steps and quality gates |
| §2.6 SHIP | `retro` | Session retrospective (worked/didn't/lessons) |

**Lifecycle**: `create` → `update` (content evolves) → `archive` (marks as done).

### 3.5 Error Diagnosis

When encountering errors, ALWAYS check for known fixes first:

```
aidd_diagnose_error { error: "error message or description" }
```

### 3.6 Lifecycle Tracking (Optional)

For features spanning multiple sessions or AIDD phases:

```
aidd_lifecycle_init { feature: "name", sessionId: SESSION_ID }
aidd_lifecycle_advance { lifecycleId: "..." }  // at each phase transition
aidd_lifecycle_status { lifecycleId: "..." }    // check progress
```

### 3.7 Pre-Commit Checks

BEFORE any git commit, run these in order:

1. `aidd_generate_commit_message { diff: "staged diff output" }`
2. `aidd_ci_diff_check { changedFiles: ["file1.ts", "file2.ts"] }`
3. `aidd_scan_secrets` on any new files

### 3.8 Guidance Tools

When uncertain about next steps or task routing:

- `aidd_classify_task { description: "task description" }` — get optimal agent/workflow
- `aidd_suggest_next { currentTask, phase }` — get context-aware suggestions
- `aidd_apply_heuristics { decision: "..." }` — analyze a decision through 10 heuristics

---

## 4. Quick Reference

| Trigger               | Tool                                                  | Workflow Step |
| --------------------- | ----------------------------------------------------- | ------------- |
| Conversation starts   | `aidd_start`                                          | §1 Startup |
| After startup         | `aidd_memory_search`                                  | §2.1 UNDERSTAND |
| Ideas explored        | `aidd_artifact` (brainstorm)                          | §2.1 UNDERSTAND |
| Research done         | `aidd_artifact` (research)                            | §2.1 UNDERSTAND |
| Entering plan mode    | `aidd_session` (update) + `aidd_artifact` (plan)      | §2.2 PLAN |
| Plan approved         | `aidd_artifact` (archive) + observation + spec/adr     | §2.3 PLAN |
| Plan rejected         | `aidd_session` (update) + observation                  | §2.3 PLAN |
| Architecture decision | `aidd_artifact` (adr)                                 | §2.2-§2.3 |
| Task group done       | `aidd_session` (update)                               | §2.4 BUILD |
| Bug/blocker found     | `aidd_artifact` (issue) + `aidd_diagnose_error`       | §2.4 BUILD |
| Error encountered     | `aidd_diagnose_error`                                 | §2.4 BUILD |
| Verification steps    | `aidd_artifact` (checklist)                           | §2.5 VERIFY |
| Before git commit     | `aidd_generate_commit_message` + `aidd_ci_diff_check` | §2.5 VERIFY |
| Framework content     | `aidd_draft_create`                                   | §2.3 PLAN |
| Conversation ends     | 7-step Session End Protocol                           | §2.6 SHIP |

---

## 5. Automatic Operations (Zero Token Cost)

These run server-side via HookBus. Do NOT call them manually:

| Auto-Hook                 | Trigger                 | Action                           |
| ------------------------- | ----------------------- | -------------------------------- |
| `pattern-auto-detect`     | Every observation saved | Detects banned output patterns   |
| `pattern-model-profile`   | Session end             | Computes model fingerprint       |
| `evolution-auto-analyze`  | Every 5th session       | Generates improvement candidates |
| `evolution-feedback-loop` | User feedback received  | Adjusts candidate confidence     |
| `evolution-auto-prune`    | Every 10th session      | Cleans stale data                |

---

## 6. Project Overview

This is the **aidd.md** repository — the open standard for AI-Driven Development. It contains:

- **content/agents/** — Agent definitions (routing.md + per-agent files)
- **content/rules/** — Domain-specific rules (global, orchestrator, frontend, backend, etc.)
- **content/skills/** — Specialized agent capabilities with SKILL.md + validation scripts
- **content/workflows/** — Step-by-step guides for complex multi-agent tasks
- **content/specs/** — AIDD standard specifications (lifecycle, memory layer, heuristics, etc.)
- **content/knowledge/** — Technology Knowledge Base (TKB) entries
- **content/templates/** — Task routing and decision templates
- **packages/** — Shared libraries and CLI
- **mcps/** — MCP server packages (Core, Memory, Tools + Engine)
- **.aidd/** — This repo's project state (uses content/ via config)

### SSOT

`content/agents/routing.md` is the canonical agent hierarchy. Root `AGENTS.md` is a thin redirect for Gemini compatibility. If there is conflict between agent definitions and other files, agents win.

### Commands

| Command              | Purpose                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm setup`         | Full setup: install deps, build, detect IDEs, configure, verify (alias: `pnpm mcp:setup`)       |
| `pnpm mcp:build`     | Build all MCP packages                                                                          |
| `pnpm mcp:dev`       | Watch mode for MCP development                                                                  |
| `pnpm mcp:test`      | Run MCP tests                                                                                   |
| `pnpm mcp:typecheck` | TypeScript type checking                                                                        |
| `pnpm mcp:clean`     | Clean build artifacts                                                                           |
| `pnpm mcp:status`    | Detailed package build status                                                                   |
| `pnpm mcp:doctor`    | Full diagnostic (supports `--json`, `--fix`, `--deep`, `--quiet`, `--no-runtime`, `--no-color`) |
| `pnpm mcp:check`     | Single-line status for startup                                                                  |

### Tech Stack (This Repo)

- **Runtime**: Node.js 22 LTS
- **Package Manager**: pnpm 10
- **Language**: TypeScript 5.9 (strict mode)
- **MCP SDK**: @modelcontextprotocol/sdk
- **Validation**: Zod 4
- **Build**: tsup
- **Testing**: Vitest 4

### Rules

1. Follow `content/agents/routing.md` as SSOT for agent roles
2. Load domain-specific rules from `content/rules/` as needed
3. Use skills from `content/skills/[agent]/SKILL.md` for specialized tasks
4. Follow workflows from `content/workflows/` for multi-step procedures
5. ES modules only (`import`/`export`), never `require`
6. TypeScript strict mode, no `any` without documented exception
7. Evidence-first: logic/data/principles, never opinions

**Note:** This repo's `.aidd/config.json` points to `../content/*` because `content/` at root IS the framework source that gets bundled in npm packages. Adopter projects copy `content/` into their `.aidd/content/` directory.

### Package Structure

```
packages/
  shared/           @aidd.md/mcp-shared    (types, utils, server factory)
  cli/              @aidd.md/cli           (CLI — framework management)

mcps/
  mcp-aidd-engine/  @aidd.md/mcp-engine    (engine — all modules in one process)
  mcp-aidd-core/    @aidd.md/mcp-core      (brain — guidance, routing, knowledge)
  mcp-aidd-memory/  @aidd.md/mcp-memory    (memory — sessions, evolution, analytics)
  mcp-aidd-tools/   @aidd.md/mcp-tools     (hands — validation, enforcement, CI)
```

See [mcps/README.md](mcps/README.md) for full architecture and [mcps/PLAN.md](mcps/PLAN.md) for implementation roadmap.
