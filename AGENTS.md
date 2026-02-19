# AIDD — Project Instructions for AGENTS.md

> AI-Driven Development Framework — MCP Ecosystem
> **Last Updated**: 2026-02-18

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
| `tokenBudget`        | `'minimal' \| 'standard' \| 'full'` — controls response verbosity |

This returns: session context + framework rules + active agents + suggested next steps.
**Store the session ID returned by `aidd_start`. You need it for ALL subsequent operations.**

**Session tracking modes**: When `content.sessionTracking` is `false` in config, `aidd_start` returns workflow guidance without creating a database session. When `undefined`, a setup prompt is returned. All subsequent session/artifact/observation tools are skipped in workflow-only mode.

**Fallback** (MCP unavailable): Run `pnpm mcp:check` in the terminal.

Expected status:
- `[aidd.md] Engine - ON` — All MCP packages built and ready
- `[aidd.md] Engine - PARTIAL` — Some packages need rebuilding
- `[aidd.md] Engine - OFF` — Setup required

---

## 2. Conversation Lifecycle

**ALWAYS maintain session state throughout the conversation. These operations are NOT optional.**

### 2.1 Session Updates

Call `aidd_session { action: "update", id: SESSION_ID }` at task boundaries.

**MUST update after:**
- Completing a task group → append `tasksCompleted`, `filesModified`
- Starting new tasks → set `tasksPending`
- Making a significant decision → append `decisions`
- Resolving an error or bug → append `errorsResolved`

**DO NOT update after:**
- Every individual file read or write
- Routine operations following existing patterns
- Trivial mechanical changes

### 2.2 Observations

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

### 2.3 Memory Operations

**BEFORE planning (UNDERSTAND phase):** ALWAYS search memory first.

```
aidd_memory_search { query: "relevant topic" }
→ aidd_memory_context { anchor: "<id>" }     // if timeline needed
→ aidd_memory_get { ids: ["<id1>", "<id2>"] } // for full details
```

**AFTER significant work (SHIP phase):** Write permanent memory.
- Decisions: `aidd_memory_add_decision { decision, reasoning }`
- Mistakes: `aidd_memory_add_mistake { error, rootCause, fix, prevention }`
- Conventions: `aidd_memory_add_convention { convention, example }`

**Before creating a PR:** Export memory for Git visibility.

```
aidd_memory_export
```

### 2.4 Artifacts

Call `aidd_artifact { action: "create" }` to persist workflow documents.

| Workflow Stage        | Artifact Type |
| --------------------- | ------------- |
| After brainstorming   | `brainstorm`  |
| After planning        | `plan`        |
| After research        | `research`    |
| Architecture decision | `adr`         |
| Diagram created       | `diagram`     |
| Issue discovered      | `issue`       |
| Spec written          | `spec`        |
| Verification steps    | `checklist`   |
| Post-mortem           | `retro`       |

Lifecycle: `create` → `update` (as work progresses) → `archive` (when done).

### 2.5 Error Diagnosis

When encountering errors, ALWAYS check for known fixes first:

```
aidd_diagnose_error { error: "error message or description" }
```

### 2.6 Lifecycle Tracking (Optional)

For features spanning multiple AIDD phases (UNDERSTAND → PLAN → SPEC → BUILD → VERIFY → SHIP):

```
aidd_lifecycle_init { feature: "name", sessionId: SESSION_ID }
aidd_lifecycle_advance { lifecycleId: "..." }  // at each phase transition
aidd_lifecycle_status { lifecycleId: "..." }    // check progress
```

### 2.7 Pre-Commit Checks

BEFORE any git commit, run these in order:

1. `aidd_generate_commit_message { diff: "staged diff output" }`
2. `aidd_ci_diff_check { changedFiles: ["file1.ts", "file2.ts"] }`
3. `aidd_scan_secrets` on any new files

### 2.8 Guidance Tools

When uncertain about next steps or task routing:

- `aidd_classify_task { description: "task description" }` — get optimal agent/workflow
- `aidd_suggest_next { currentTask, phase }` — get context-aware suggestions
- `aidd_apply_heuristics { decision: "..." }` — analyze a decision through 10 heuristics

---

## 3. Session End Protocol

**MANDATORY — you MUST execute this before the conversation ends.**

```
aidd_session {
  action: "end",
  id: SESSION_ID,
  output: "Brief summary of work completed",
  tokenUsage: {
    inputTokens: 1234,
    outputTokens: 5678
  },
  outcome: {
    testsPassing: true | false,
    complianceScore: 0-100,
    reverts: 0,
    reworks: 0,
    userFeedback: "positive" | "neutral" | "negative"
  }
}
```

If significant decisions were made during this session: call `aidd_memory_export` before ending.

**Server-side auto-hooks fire after session end (zero token cost):**
- Model fingerprint computed
- Pattern profiling updated
- Evolution analysis (every 5th session)
- Data pruning (every 10th session)

---

## 4. Quick Reference

| Trigger               | Tool                                                  | When                           |
| --------------------- | ----------------------------------------------------- | ------------------------------ |
| Conversation starts   | `aidd_start`                                          | ALWAYS first call              |
| Before exploring code | `aidd_memory_search`                                  | Check for prior context        |
| Error encountered     | `aidd_diagnose_error`                                 | Check for known fixes          |
| Decision made         | `aidd_observation` (decision)                         | During work                    |
| Bug found/fixed       | `aidd_observation` (mistake)                          | During work                    |
| Task group done       | `aidd_session` (update)                               | At task boundaries             |
| Need guidance         | `aidd_classify_task` / `aidd_suggest_next`            | When uncertain                 |
| Multi-phase feature   | `aidd_lifecycle_init`                                 | Optional, for complex features |
| Phase transition      | `aidd_lifecycle_advance`                              | During lifecycle tracking      |
| Before git commit     | `aidd_generate_commit_message` + `aidd_ci_diff_check` | Pre-commit                     |
| Before PR             | `aidd_memory_export`                                  | Export memory to Git           |
| Conversation ends     | `aidd_session` (end)                                  | ALWAYS last call               |

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

- **`AGENTS.md` (this file)**: Operational protocol — startup, session lifecycle, memory operations, session end. Loaded by Gemini and other agents that read root `AGENTS.md`.
- **`content/agents/routing.md`**: Agent hierarchy — roles, competency matrix, workflow orchestrators, system map. Canonical source for agent definitions.

If there is conflict between agent definitions and other files, `content/agents/routing.md` wins for agent roles; this file wins for operational protocol.

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
