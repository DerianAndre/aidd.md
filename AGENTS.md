# AIDD — AI-Driven Development Framework

> Open standard for structured, memory-aware AI development workflows.
> Content is standalone. MCPs are optional. Workflow depth is adaptive.

---

## 1. Workflow

AIDD uses an adaptive workflow. Depth scales with task complexity — the AI picks the right level, or the user overrides.

### Minimal (trivial tasks: typos, config, single-file fixes)

Just do the work. No ceremony needed.

### Standard (moderate tasks: features, bug fixes, multi-file changes)

1. **UNDERSTAND** — Read the request. Search memory for prior context. Explore the codebase.
2. **PLAN** — If touching 3+ files or making non-obvious decisions, plan before coding.
3. **BUILD** — Execute the plan. Record significant decisions and learnings.
4. **VERIFY** — Run typecheck, tests, build as appropriate.

### Full (complex tasks: architecture changes, new systems, cross-cutting work)

1. **UNDERSTAND** — Deep exploration. Brainstorm options and trade-offs.
2. **PLAN** — Formal plan with task breakdown. Architecture decisions documented.
3. **BUILD** — Execute with session tracking. Record observations for significant learnings.
4. **VERIFY** — Full verification: typecheck + tests + build + lint.
5. **SHIP** — Summarize work, persist learnings to memory, close session.

The user can always override: "skip brainstorm", "full workflow", "just do it".

---

## 2. Content

The framework's intelligence lives in `content/`:

| Directory | Purpose |
|-----------|---------|
| `content/routing.md` | Agent hierarchy, roles, competency matrix (SSOT) |
| `content/rules/` | Domain-specific rules (global, frontend, backend, etc.) |
| `content/skills/` | Specialized agent capabilities |
| `content/workflows/` | Step-by-step guides for complex tasks |
| `content/specs/` | AIDD standard specifications |
| `content/knowledge/` | Technology Knowledge Base (TKB) entries |
| `content/templates/` | Task routing and decision templates |

**Content works without MCPs.** Read and follow these files directly. MCPs enhance content with persistence and automation, but are not required.

---

## 3. MCP Enhancement (Optional)

When AIDD MCP tools are available, they enhance the workflow with memory, guidance, and quality checks. Each MCP is independently useful:

### Core (Guidance + Routing)

- `aidd_start` — Session bootstrap. Returns project context and suggested workflow.
- `aidd_classify_task` — Optimal agent/workflow routing.
- `aidd_suggest_next` — Context-aware next steps.
- `aidd_query_tkb` / `aidd_get_tkb_entry` — Knowledge base lookup.

### Memory (Persistence + Learning)

- `aidd_session` — Track session state (start/update/end).
- `aidd_observation` — Record significant learnings.
- `aidd_artifact` — Persist workflow documents (brainstorm, plan, retro, etc.).
- `aidd_memory_search` — Find prior context across sessions.
- `aidd_memory_add_decision` / `aidd_memory_add_mistake` / `aidd_memory_add_convention` — Write permanent memory.
- `aidd_diagnose_error` — Check known fixes via similarity matching.
- `aidd_branch` — Save/restore branch context for multi-session work.

### Tools (Validation + Enforcement)

- `aidd_scan_secrets` — Security scan.
- `aidd_check_compliance` — Rule enforcement.
- `aidd_generate_commit_message` — Pre-commit message generation.

### Session Lifecycle (when using Memory MCP)

```
aidd_start → work → aidd_session { action: "end", output: "summary" }
```

That's it. Start, work, end. Everything between is adaptive.

---

## 4. Configuration

`.aidd/config.json` is the single source of configuration. AI reads it, never writes it.

---

## 5. SSOT

`content/routing.md` is the canonical source for agent hierarchy and task dispatch. This file (`AGENTS.md`) is the operational protocol. If there is conflict: `content/routing.md` wins for agent roles; this file wins for workflow.
