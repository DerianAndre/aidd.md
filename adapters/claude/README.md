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
| **Protocol** | `CLAUDE.md` | Directive instructions the AI follows (startup, lifecycle, session end) |
| **Configuration** | `.claude/settings.json` | Permissions, hooks, status line — one-file DX setup |
| **MCP Server** | `@aidd.md/mcp-engine` | 71 tools for sessions, memory, validation, evolution |

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
4. Status line should show: `[Model] ▓▓▓░░░░░░░ 30% | $0.05 | 3m 20s`

---

## 3. Configuration Files

### `.claude/settings.json`

Project-level configuration committed to Git. Contains:

- **Permissions**: Auto-allow all 71 AIDD MCP tools + common Bash commands
- **Hooks**: 5 hooks across 3 events for protocol enforcement
- **Status Line**: Node.js script showing model, context, cost, duration

### `.claude/settings.local.json`

User-local overrides (gitignored). Use for personal preferences that shouldn't affect the team.

### `CLAUDE.md`

Project instructions loaded at every conversation start. Contains the full AIDD conversation lifecycle protocol with directive language (MUST/ALWAYS/NEVER). Sections:

1. **Startup Protocol** — `aidd_start` as mandatory first call
2. **Conversation Lifecycle** — Session updates, observations, memory, artifacts, error diagnosis, pre-commit
3. **Session End Protocol** — `aidd_session:end` as mandatory last call
4. **Quick Reference** — Trigger-to-tool lookup table
5. **Automatic Operations** — Zero-token server-side hooks
6. **Project Overview** — Repository structure, commands, tech stack

### `.claude/statusline.js`

Cross-platform Node.js script for the status line. Receives JSON via stdin, outputs formatted status with color-coded context usage.

---

## 4. Hooks System

AIDD uses 5 hooks across 3 Claude Code events for layered protocol enforcement:

### Hook Inventory

| # | Event | Type | Matcher | Purpose |
|---|-------|------|---------|---------|
| 1 | `SessionStart` | command | `startup` | Inject AIDD protocol reminder on fresh sessions |
| 2 | `SessionStart` | command | `resume\|compact\|clear` | Re-inject context after compaction/resume |
| 3 | `PreCompact` | command | `""` (all) | Remind to save pending state before context loss |
| 4 | `Stop` | command | `""` (all) | Inject session end reminder |
| 5 | `Stop` | prompt | `""` (all) | Enforce session closure (Haiku evaluation) |

### Enforcement Strategy

Three enforcement layers ensure protocol compliance:

1. **CLAUDE.md** — Directive instructions make the AI want to follow the protocol
2. **Command hooks** — Deterministic reminders injected into context (zero token cost)
3. **Prompt hook** — LLM evaluation on Stop enforces session closure (~$0.001/call via Haiku)

### Stop Hook Loop Prevention

The Stop event uses the `stop_hook_active` pattern:

- **First stop**: Prompt hook evaluates → returns `{ok: false}` → Claude continues and closes session
- **Second stop**: `stop_hook_active=true` → returns `{ok: true}` → conversation ends

### Windows Compatibility

All hooks use portable commands:

- `echo` for command hooks (works in cmd, PowerShell, bash)
- `node .claude/statusline.js` for status line (Node.js handles path separators)
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
| VERIFY | — | Observations (mistakes) |
| SHIP | — | Permanent memory + export |

---

## 8. Conversation Lifecycle

```
┌─────────────────────────────────────────────────────┐
│ CONVERSATION START                                   │
│   Hook: SessionStart(startup) → protocol reminder    │
│   AI: aidd_start → session ID                        │
├─────────────────────────────────────────────────────┤
│ WORK PHASE                                           │
│   AI: aidd_memory_search (before planning)           │
│   AI: aidd_session { update } (at task boundaries)   │
│   AI: aidd_observation (on significant learnings)    │
│   AI: aidd_diagnose_error (on errors)                │
│   AI: aidd_artifact (at workflow stages)              │
│   Server: pattern-auto-detect (after observations)   │
├─────────────────────────────────────────────────────┤
│ PRE-COMMIT                                           │
│   AI: aidd_generate_commit_message                   │
│   AI: aidd_ci_diff_check                             │
│   AI: aidd_scan_secrets                              │
├─────────────────────────────────────────────────────┤
│ CONVERSATION END                                     │
│   Hook: Stop → reminder + enforcement                │
│   AI: aidd_session { end } → close with outcome      │
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
