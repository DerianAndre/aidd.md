# Warp Adapter

> AIDD integration guide for Warp (warp.dev)

**Last Updated**: 2026-02-08
**Status**: Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Setup](#2-setup)
3. [Context Loading](#3-context-loading)
4. [Rules and Constraints](#4-rules-and-constraints)
5. [Limitations](#5-limitations)
6. [Recommended Workflow](#6-recommended-workflow)

---

## 1. Overview

Warp integrates with AIDD at the **context layer only**:

| Layer | Mechanism | Status |
|-------|-----------|--------|
| **Context** | `AGENTS.md` content in Warp AI | Supported |
| **MCP** | Not available | Not supported |
| **Hooks** | Not available | Not supported |

Warp's AI features use project context from files. AIDD integration requires manually providing `AGENTS.md` content or configuring Warp's AI context settings.

---

## 2. Setup

### Step 1: Configure Warp AI Context

In Warp Settings → AI → Custom Instructions, add the following:

```
Follow the AIDD (AI-Driven Development) standard. Read AGENTS.md at the project root for agent roles, rules, and workflows. Follow content/rules/global.md as immutable constraints.
```

### Step 2: Verify Context

Start a Warp AI session and ask:

```
What rules does this project follow?
```

Warp should reference AIDD rules from the project's `AGENTS.md` and `content/rules/` directory.

---

## 3. Context Loading

Warp reads project files when referenced in AI chat. Point Warp to these AIDD files:

| File | Purpose |
|------|---------|
| `AGENTS.md` | Agent hierarchy and system map |
| `content/rules/global.md` | Immutable constraints |
| `content/rules/<domain>.md` | Domain-specific rules (frontend, backend, testing) |
| `content/specs/aidd-lifecycle.md` | 6-phase development lifecycle |

### System Hierarchy

```
AGENTS.md (Single Source of Truth)
  └── content/
      ├── agents/     Agent definitions (routing.md as SSOT)
      ├── rules/      Immutable constraints (global.md supersedes all)
      ├── skills/     Specialized capabilities (SKILL.md + scripts/)
      ├── workflows/  Multi-step procedures
      ├── specs/      AIDD standard specifications
      └── knowledge/  Technology Knowledge Base
```

---

## 4. Rules and Constraints

### Golden Rules

These immutable constraints apply to all AIDD contexts:

1. Never break backward compatibility without explicit confirmation
2. Never commit secrets to version control
3. Never disable tests to make CI pass
4. Never use `any` type in TypeScript without documented exception
5. Never use `SELECT *` in production SQL
6. Readability > Cleverness

### Model Tier Strategy

AIDD optimizes cost via tiered model usage:

| Tier | Effort | Tasks |
|------|--------|-------|
| 1 (HIGH) | Architecture, security, planning | Critical decisions |
| 2 (STANDARD) | Implementation, integration | Complex patterns |
| 3 (LOW) | Tests, boilerplate, formatting | Mechanical tasks |

### Technology Knowledge Base

`content/knowledge/` contains quantified metrics for technologies organized by domain. Query the TKB before making technology recommendations.

---

## 5. Limitations

Without MCP support, Warp cannot:

- Track sessions across conversations
- Persist memory (decisions, mistakes, conventions)
- Run AIDD validation tools
- Generate commit messages or CI checks
- Access evolution or analytics features

**Recommendation**: Use Warp as a terminal alongside an MCP-capable editor (Claude Code, Cursor) for full AIDD integration. Warp provides context-aware terminal assistance while the editor handles session lifecycle.

---

## 6. Recommended Workflow

### Warp as Terminal Companion

```
┌──────────────────────┐    ┌──────────────────────┐
│ Claude Code / Cursor │    │ Warp Terminal         │
│                      │    │                       │
│ - Full MCP (71 tools)│    │ - Context from        │
│ - Session lifecycle  │◄──►│   AGENTS.md           │
│ - Memory persistence │    │ - Rule-aware commands │
│ - Hooks + automation │    │ - Git operations      │
│                      │    │ - Build/test/deploy   │
└──────────────────────┘    └──────────────────────┘
```

1. Use your MCP-capable editor for development work (full AIDD lifecycle)
2. Use Warp for terminal operations with AIDD context awareness
3. Warp's AI understands project rules when `AGENTS.md` is referenced

### Standalone Usage

When using Warp without an MCP editor, manually follow the AIDD lifecycle:

1. **UNDERSTAND** — Read requirements, check `content/specs/aidd-lifecycle.md`
2. **PLAN** — Create plan in `docs/plans/active/`
3. **BUILD** — Follow the plan, reference `content/rules/` for constraints
4. **TEST** — Run tests, typecheck, build, lint
5. **REVIEW** — Verify results meet expectations
6. **SHIP** — Commit with conventional format, archive plan to `docs/plans/done/`

---

## Cross-References

- **Adapters Overview**: `adapters/README.md`
- **AIDD Lifecycle**: `content/specs/aidd-lifecycle.md`
- **Agent Hierarchy**: `content/agents/routing.md`
- **MCP Architecture**: `mcps/README.md`
