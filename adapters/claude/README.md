# Claude Code Adapter

> AIDD integration guide for Claude Code (claude.ai/claude-code)

**Last Updated**: 2026-02-08
**Status**: Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Setup](#2-setup)
3. [Configuration Files](#3-configuration-files)
4. [Hooks System](#4-hooks-system)
5. [Status Line](#5-status-line)
6. [MCP Integration](#6-mcp-integration)
7. [Memory Layer](#7-memory-layer)
8. [Conversation Lifecycle](#8-conversation-lifecycle)

---

## 1. Overview

AIDD integrates with Claude Code through three layers:

| Layer | File | Purpose |
|-------|------|---------|
| **Protocol** | `CLAUDE.md` | Directive instructions the AI follows (startup, mandatory workflow pipeline, session end) |
| **Configuration** | `.claude/settings.json` | Permissions, hooks, status line — one-file DX setup |
| **MCP Server** | `@aidd.md/mcp-engine` | 82 tools for sessions, memory, validation, evolution |

Claude Code natively reads `CLAUDE.md` at session start and `AGENTS.md` for agent context. AIDD leverages this behavior to provide structured protocol without additional tooling.

---

## 2. Setup

### Prerequisites

- Node.js 22 LTS
- pnpm 10
- Claude Code CLI or VS Code extension

### Installation

```bash
# Clone and setup
git clone <repo>
pnpm setup

# Verify MCP server
pnpm mcp:check
# Expected: [aidd.md] Engine - ON — 5/5 packages ready
```

### Verification

1. Start a new Claude Code conversation
2. The SessionStart hook should fire: `[AIDD Protocol] You MUST call aidd_start...`
3. AI should call `aidd_start` as its first action
4. Hook `on-session-init.cjs` fires — enforces mandatory brainstorm
5. Status line should show: `[Model] ▓▓▓░░░░░░░ 30% | $0.05 | 3m 20s`

---

## 3. Configuration Files

### `.claude/settings.json`

Project-level configuration committed to Git. Contains:

- **Permissions**: Auto-allow all 71 AIDD MCP tools + common Bash commands
- **Hooks**: 9 hooks (8 command + 1 prompt) across 4 events for mandatory workflow pipeline enforcement
- **Status Line**: Node.js script showing model, context, cost, duration

### `.claude/settings.local.json`

User-local overrides (gitignored). Use for personal preferences that shouldn't affect the team.

### `CLAUDE.md`

Project instructions loaded at every conversation start. Contains the full AIDD mandatory workflow pipeline with directive language (MUST/ALWAYS/NEVER). Sections:

1. **Startup Protocol** — `aidd_start` as mandatory first call
2. **Mandatory Workflow Pipeline** — Brainstorm → Plan → Execute → Test → Review → Ship (every step enforced by hooks)
3. **Operations Reference** — Session updates, observations, memory, artifacts, error diagnosis, pre-commit
4. **Quick Reference** — Trigger-to-tool lookup table
5. **Automatic Operations** — Zero-token server-side hooks
6. **Project Overview** — Repository structure, commands, tech stack

### `.claude/statusline.js`

Cross-platform Node.js script for the status line. Receives JSON via stdin, outputs formatted status with color-coded context usage.

---

## 4. Hooks System

AIDD uses 9 hooks (8 command + 1 prompt) across 4 Claude Code events for mandatory workflow pipeline enforcement:

### Hook Inventory

| # | Event | Type | Matcher | Script | Workflow Step |
|---|-------|------|---------|--------|---------------|
| 1 | `SessionStart` | command | `startup` | `on-startup.cjs` | Query DB for active session + orphaned artifacts |
| 2 | `SessionStart` | command | `resume\|compact\|clear` | `on-resume.cjs` | Recover session context with task/artifact counts |
| 3 | `PreCompact` | command | `""` (all) | `on-pre-compact.cjs` | Warn with session state + artifact count |
| 4 | `PostToolUse` | command | `mcp__aidd-engine__aidd_start` | `on-session-init.cjs` | **Enforce mandatory brainstorm (§2.1)** |
| 5 | `PostToolUse` | command | `EnterPlanMode` | `on-plan-enter.cjs` | **Verify brainstorm exists + enforce plan artifact (§2.2)** |
| 6 | `PostToolUse` | command | `ExitPlanMode` | `on-plan-exit.cjs` | **Compliance tracking + approval/rejection protocol (§2.3)** |
| 7 | `PostToolUse` | command | `mcp__aidd-engine__aidd_session` | `on-session-end.cjs` | **Review enforcement: verify checklist + retro on end (§2.7)** |
| 8 | `Stop` | command | `""` (all) | `on-stop.cjs` | Enforce test + review + retro + archival + session end |
| 9 | `Stop` | prompt | `""` (all) | (inline) | Block conversation end if session still active |

All hook scripts live in `scripts/hooks/` (adapter-agnostic). The `.claude/settings.json` references them as `node scripts/hooks/<name>.cjs`.

### Mandatory Workflow Enforcement

Hooks enforce the mandatory pipeline at every transition:

| Workflow Step | Hook | Enforcement |
|---------------|------|-------------|
| §2.1 Brainstorm | `on-session-init.cjs` | After `aidd_start`, requires brainstorm artifact creation |
| §2.2 Plan | `on-plan-enter.cjs` | Checks brainstorm artifact exists, provides session/artifact IDs |
| §2.3 Plan Approval | `on-plan-exit.cjs` | Tracks iteration count, computes compliance score hints |
| §2.7 Ship | `on-session-end.cjs` | On `action: "end"`, verifies checklist + retro artifacts exist |
| Stop | `on-stop.cjs` | Scores workflow completeness (X/4 steps), lists missing artifacts |

### Smart Hooks

Hook scripts query `.aidd/data.db` via `better-sqlite3` (readonly) to provide state-aware enforcement:

- **Session state**: Active session ID, branch, input, task counts
- **Artifact tracking**: Active artifacts by type, orphaned artifacts, plan/brainstorm/research IDs
- **Compliance hints**: Iteration count from session decisions, workflow completeness scoring
- **Specific instructions**: Hook output includes exact session/artifact IDs for MCP tool calls

PostToolUse hooks (#4, #7) receive JSON via stdin with `tool_name`, `tool_input`, `tool_response` — enabling context-aware filtering (e.g., `on-session-end.cjs` only acts when `action === "end"`).

All scripts use `try/catch` with generic fallback messages for graceful degradation when the DB doesn't exist (fresh projects).

### Enforcement Strategy

Three enforcement layers ensure protocol compliance:

1. **CLAUDE.md** — Directive instructions (MUST/ALWAYS/NEVER) with mandatory workflow pipeline make the AI follow the pipeline at every step
2. **Smart command hooks** — DB-aware Node.js scripts inject specific session/artifact IDs and enforce artifact creation at every workflow transition
3. **Prompt enforcer on Stop** — Blocks conversation from ending if AIDD session is still active

### Windows Compatibility

All hooks use portable Node.js scripts (`.cjs` extension for CommonJS compatibility):

- `node scripts/hooks/<name>.cjs` for command hooks (cross-platform)
- `node .claude/statusline.js` for status line
- No `jq`, `grep`, or Unix-specific dependencies

---

## 5. Status Line

The status line shows real-time session information at the bottom of the terminal:

```
[Sonnet 4.5] ▓▓▓░░░░░░░ 30% | $0.05 | 3m 20s
```

Components:

- **Model name**: Current model in use
- **Context bar**: Visual progress bar with color thresholds (green < 70%, yellow 70-90%, red > 90%)
- **Cost**: Running cost in USD
- **Duration**: Session elapsed time

Implementation: `.claude/statusline.js` — a Node.js script that reads JSON from stdin and outputs formatted text. Cross-platform (Windows, macOS, Linux).

---

## 6. MCP Integration

### Engine Server

The AIDD Engine (`@aidd.md/mcp-engine`) consolidates all MCP functionality into a single server process. Configure in `.claude/mcp.json` or `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "aidd-engine": {
      "command": "node",
      "args": ["path/to/mcps/mcp-aidd-engine/dist/index.js"],
      "env": {
        "AIDD_PROJECT_ROOT": "/path/to/project"
      }
    }
  }
}
```

### Permission Configuration

The `.claude/settings.json` auto-allows all engine tools:

```json
{
  "permissions": {
    "allow": ["mcp__aidd-engine"]
  }
}
```

This matches all tools prefixed with `mcp__aidd-engine__` (e.g., `mcp__aidd-engine__aidd_start`, `mcp__aidd-engine__aidd_session`, etc.).

### Critical Path Tools

These tools form the minimum viable protocol:

| Tool | When | Required |
|------|------|----------|
| `aidd_start` | Conversation start | Yes |
| `aidd_session { update }` | During work | Yes |
| `aidd_session { end }` | Conversation end | Yes |
| `aidd_artifact` | Every workflow step | Yes |
| `aidd_memory_search` | Before planning | Recommended |
| `aidd_diagnose_error` | On errors | Recommended |
| `aidd_observation` | On learnings | Recommended |

---

## 7. Memory Layer

AIDD provides a 3-layer memory system:

### Layer 1: Observations (Session-Scoped)

Recorded during work via `aidd_observation`. Types: decision, mistake, convention, pattern, preference, insight, tool_outcome, workflow_outcome.

Indexed for full-text search. Accessible via `aidd_memory_search`.

### Layer 2: Permanent Memory (Cross-Session)

Written explicitly via `aidd_memory_add_decision`, `aidd_memory_add_mistake`, `aidd_memory_add_convention`.

Stored in SQLite. Persists across all sessions. Duplicate-checked on write.

### Layer 3: Exported Memory (Git-Visible)

Exported via `aidd_memory_export` to `.aidd/memory/`:

- `decisions.json` — Architecture and technology decisions
- `mistakes.json` — Errors and corrections
- `conventions.json` — Project conventions

Committed to Git for team visibility and cross-tool access.

### Memory Usage by Phase

| Phase | Read | Write |
|-------|------|-------|
| UNDERSTAND | Search all memory | — |
| PLAN | Check decisions + mistakes | — |
| BUILD | Consult conventions | Observations |
| TEST | — | Observations (mistakes) |
| REVIEW | — | — |
| SHIP | — | Permanent memory + export |

---

## 8. Conversation Lifecycle

```
┌─────────────────────────────────────────────────────┐
│ §1 STARTUP                                           │
│   Hook: on-startup.cjs → DB query, session + arts    │
│   AI: aidd_start → session ID                        │
│   AI: aidd_session { update, input } → raw input     │
│   Hook: on-session-init.cjs → enforce brainstorm     │
├─────────────────────────────────────────────────────┤
│ §2.1 UNDERSTAND — Brainstorm (MANDATORY)             │
│   AI: aidd_memory_search (check prior context)       │
│   AI: aidd_artifact (brainstorm + research)          │
│   AI: aidd_session { update, input } → refined       │
├─────────────────────────────────────────────────────┤
│ §2.2 PLAN — Create Plan (MANDATORY)                  │
│   Hook: on-plan-enter.cjs → verify brainstorm exists │
│   AI: aidd_session { update, tasksPending }          │
│   AI: aidd_artifact (plan + adr + diagram)           │
├─────────────────────────────────────────────────────┤
│ §2.3 PLAN — Plan Approval                            │
│   Hook: on-plan-exit.cjs → compliance tracking       │
│   AI: aidd_artifact { archive } + observation        │
│   AI: aidd_artifact (spec) + aidd_draft_create       │
│   [If rejected: return to §2.1 Brainstorm]           │
├─────────────────────────────────────────────────────┤
│ §2.4 BUILD — Execution                               │
│   AI: aidd_session { update } at task boundaries     │
│   AI: aidd_artifact (issue) on bugs/blockers         │
│   AI: aidd_observation on significant learnings      │
│   AI: aidd_diagnose_error on errors                  │
│   Server: pattern-auto-detect (after observations)   │
├─────────────────────────────────────────────────────┤
│ §2.5 TEST — Automated Checks                         │
│   AI: aidd_artifact (checklist)                      │
│   AI: Run typecheck + tests + build                  │
│   [If fail: return to §2.4 BUILD to fix]             │
│   AI: aidd_generate_commit_message + ci_diff_check   │
├─────────────────────────────────────────────────────┤
│ §2.6 REVIEW — Final Approval                         │
│   AI: Present results for user review                │
│   [If rejected: return to §2.1 Brainstorm]           │
│   [If approved: proceed to §2.7 SHIP]                │
├─────────────────────────────────────────────────────┤
│ §2.7 SHIP — Session End (7-step protocol)            │
│   Hook: on-stop.cjs → workflow completeness score    │
│   Hook: prompt enforcer → block if session active    │
│   AI: aidd_session { update } → final state          │
│   AI: aidd_observation + permanent memory            │
│   AI: aidd_artifact (retro)                          │
│   AI: aidd_artifact { archive } → all active arts    │
│   AI: aidd_memory_export → Git visibility            │
│   AI: aidd_session { end } → close with outcome      │
│   Hook: on-session-end.cjs → verify artifacts        │
│   Server: pattern-model-profile (auto)               │
│   Server: evolution-auto-analyze (every 5th)          │
└─────────────────────────────────────────────────────┘
```

If context is compacted mid-conversation:

1. `PreCompact` hook fires → AI saves pending state
2. After compaction, `SessionStart(compact)` hook fires → AI recovers session ID

---

## Cross-References

- **AIDD Protocol**: `CLAUDE.md`
- **User Guide**: `WORKFLOW.md`
- **Lifecycle Spec**: `content/specs/aidd-lifecycle.md`
- **Memory Spec**: `content/specs/memory-layer.md`
- **Orchestrator Rules**: `content/rules/orchestrator.md`
- **Hook Template**: `content/templates/hooks/claude-code/status-indicators.md`
- **MCP Architecture**: `mcps/README.md`
