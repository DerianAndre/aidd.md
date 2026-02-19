# Cursor Adapter

> AIDD integration guide for Cursor (cursor.sh)

**Last Updated**: 2026-02-18
**Status**: Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Setup](#2-setup)
3. [Rules Integration](#3-rules-integration)
4. [MCP Integration](#4-mcp-integration)
5. [Context Loading](#5-context-loading)
6. [Memory Layer](#6-memory-layer)
7. [Conversation Lifecycle](#7-conversation-lifecycle)

---

## 1. Overview

Cursor integrates with AIDD through two layers:

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| **Context** | `.cursor/rules/` symlink + `AGENTS.md` | Agent roles, domain rules, immutable constraints |
| **MCP** | `@aidd.md/mcp-engine` | 82 tools for sessions, memory, validation, evolution |

Cursor reads `.cursor/rules/` for rule files and `AGENTS.md` for agent context. AIDD maps both to the same `content/` source of truth via symlink.

---

## 2. Setup

### Prerequisites

- Node.js 22 LTS
- pnpm 10
- Cursor IDE

### Step 1: Build MCP Server

```bash
pnpm setup

# Verify
pnpm mcp:check
# Expected: [aidd.md] Engine - ON — 5/5 packages ready
```

### Step 2: Create Rules Symlink

**Windows (PowerShell as Admin):**
```powershell
mklink /D .cursor\rules content\rules
```

**Unix (macOS/Linux):**
```bash
ln -s content/rules .cursor/rules
```

### Step 3: Configure MCP Server

In Cursor Settings → MCP Servers, add:

```json
{
  "aidd-engine": {
    "command": "node",
    "args": ["path/to/mcps/mcp-aidd-engine/dist/index.js"],
    "env": {
      "AIDD_PROJECT_ROOT": "/path/to/project"
    }
  }
}
```

### Verification

1. Open Cursor in the project directory
2. Cursor should load rules from `.cursor/rules/`
3. MCP tools should be available in Cursor's AI chat

---

## 3. Rules Integration

The `.cursor/rules/` symlink maps directly to AIDD's `content/rules/` structure:

| AIDD Source | Cursor Reads As | Scope |
|-------------|----------------|-------|
| `content/rules/global.md` | `.cursor/rules/global.md` | All contexts |
| `content/rules/orchestrator.md` | `.cursor/rules/orchestrator.md` | Task routing |
| `content/rules/frontend.md` | `.cursor/rules/frontend.md` | Frontend code |
| `content/rules/backend.md` | `.cursor/rules/backend.md` | Backend code |
| `content/rules/testing.md` | `.cursor/rules/testing.md` | Test files |

`global.md` supersedes all domain-specific rules, consistent with the AIDD hierarchy.

---

## 4. MCP Integration

When the MCP server is configured, Cursor gains access to all 82 AIDD tools. The critical path:

| Tool | When | Purpose |
|------|------|---------|
| `aidd_start` | Conversation start | Initialize session, load framework context |
| `aidd_session { update }` | During work | Track progress, decisions, errors |
| `aidd_session { end }` | Conversation end | Close session with outcome metrics |
| `aidd_memory_search` | Before planning | Check for prior decisions, mistakes, conventions |
| `aidd_diagnose_error` | On errors | Look up known fixes from memory |
| `aidd_observation` | On learnings | Record significant discoveries |

### Additional Tools

| Category | Tools | Purpose |
|----------|-------|---------|
| Validation | `aidd_validate_*`, `aidd_audit_*` | Code quality checks |
| Pre-commit | `aidd_generate_commit_message`, `aidd_ci_diff_check` | Change validation |
| Knowledge | `aidd_query_tkb`, `aidd_tech_compatibility` | Technology research |
| Guidance | `aidd_classify_task`, `aidd_suggest_next` | Task routing |

---

## 5. Context Loading

Cursor reads `AGENTS.md` at the project root for high-level context. This file provides:

- Agent hierarchy (`content/agents/routing.md` as SSOT)
- System map pointing to `content/rules/`, `content/skills/`, `content/workflows/`
- Skill discovery via `content/skills/<name>/SKILL.md`

Cursor uses this context to inform code generation, completions, and chat responses.

---

## 6. Memory Layer

When MCP is configured, Cursor has access to the full 3-layer memory system:

| Layer | Tools | Persistence |
|-------|-------|-------------|
| Observations | `aidd_observation` | Session-scoped, FTS indexed |
| Permanent | `aidd_memory_add_decision/mistake/convention` | Cross-session, SQLite |
| Exported | `aidd_memory_export` | `.aidd/memory/*.json`, Git-visible |

Search memory with `aidd_memory_search` → `aidd_memory_context` → `aidd_memory_get` for progressive detail.

---

## 7. Conversation Lifecycle

With MCP configured, the recommended conversation flow:

```
1. aidd_start                      → Initialize session
2. aidd_memory_search              → Check prior context (before planning)
3. [Work phase]
   └─ aidd_session { update }      → Track at task boundaries
   └─ aidd_observation             → Record significant learnings
   └─ aidd_diagnose_error          → Look up known fixes on errors
4. aidd_generate_commit_message    → Pre-commit validation
   └─ aidd_ci_diff_check           → Validate changed files
5. aidd_session { end }            → Close with outcome metrics
```

Without MCP, Cursor operates in context-only mode using rules and `AGENTS.md`.

---

## Cross-References

- **Adapters Overview**: `adapters/README.md`
- **AIDD Lifecycle**: `content/specs/aidd-lifecycle.md`
- **Memory Layer**: `content/specs/memory-layer.md`
- **MCP Architecture**: `mcps/README.md`
