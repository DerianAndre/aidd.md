# AIDD Workflow — User Guide

> How the AI-Driven Development framework works with Claude Code

**Last Updated**: 2026-02-08
**Status**: Reference

---

## 1. What is AIDD

AIDD (AI-Driven Development) is a framework that structures how AI assistants develop software. It provides:

- **Session tracking** — Every conversation is a tracked development session with decisions, errors, and outcomes recorded
- **Memory persistence** — Learnings from past sessions inform future work (decisions, mistakes, conventions)
- **Quality enforcement** — Automated validation, pattern detection, and compliance checks
- **Self-improvement** — The framework evolves based on usage patterns and outcomes

AIDD integrates with Claude Code through an MCP (Model Context Protocol) server that exposes 71 tools across 5 packages.

---

## 2. Core Concepts

### Sessions

Every Claude Code conversation is an AIDD session. Sessions track:

- Tasks completed and pending
- Files modified
- Decisions made and their reasoning
- Errors encountered and how they were resolved
- Outcome metrics (tests passing, compliance score, reverts, reworks)

Sessions start with `aidd_start` and end with `aidd_session { action: "end" }`.

### Observations

Significant learnings during a session are recorded as observations:

- **Decisions** — Architecture or technology choices with reasoning
- **Mistakes** — Bugs or errors with root cause and fix
- **Conventions** — Project patterns discovered during work
- **Patterns** — Recurring codebase structures
- **Insights** — Cross-concept connections

Observations feed into memory search and evolution analysis.

### Permanent Memory

Three types of persistent memory survive across sessions:

- **Decisions** (`aidd_memory_add_decision`) — Why something was built a certain way
- **Mistakes** (`aidd_memory_add_mistake`) — Errors and how to prevent them
- **Conventions** (`aidd_memory_add_convention`) — Project-specific rules discovered

Memory is searchable via `aidd_memory_search` and exportable to JSON for Git visibility.

### 6-Phase Lifecycle

For non-trivial features, AIDD follows a structured lifecycle:

| Phase | Purpose | Intelligence Tier |
|-------|---------|-------------------|
| **UNDERSTAND** | Requirements, acceptance criteria | High (Tier 1) |
| **PLAN** | Task decomposition, architecture | High (Tier 1) |
| **SPEC** | Specification as versioned artifact | Low (Tier 3) |
| **BUILD** | Implementation following the plan | Standard (Tier 2) |
| **VERIFY** | Tests, validation, spec alignment | Adaptive (Tier 3 to 2) |
| **SHIP** | Commit, archive, PR | Low (Tier 3) |

See `content/specs/aidd-lifecycle.md` for full phase definitions.

---

## 3. What Happens Automatically

These operations run server-side at zero token cost. You do not need to trigger them:

| Auto-Hook | When | What It Does |
|-----------|------|--------------|
| Pattern Auto-Detect | Every observation saved | Scans for banned output patterns |
| Model Profiling | Session end | Computes model fingerprint (7 metrics) |
| Evolution Analysis | Every 5th session | Identifies framework improvement candidates |
| Feedback Loop | User feedback received | Adjusts evolution candidate confidence |
| Auto-Prune | Every 10th session | Cleans stale data (30-day detections, caps) |

### Claude Code Hooks

The `.claude/settings.json` configures hooks that fire during conversation events:

| Event | Hook Type | Action |
|-------|-----------|--------|
| Session start | Command | Reminds AI to call `aidd_start` |
| Context compaction | Command | Reminds AI to save pending state |
| Session resume | Command | Reminds AI to recover session ID |
| Conversation stop | Command + Prompt | Enforces `aidd_session:end` before closing |

---

## 4. What the AI Does Manually

These operations are triggered by the AI during the conversation:

| Moment | Operation | Purpose |
|--------|-----------|---------|
| Conversation start | `aidd_start` | Initialize session, load framework |
| Before planning | `aidd_memory_search` | Check for prior context |
| On error | `aidd_diagnose_error` | Look up known fixes |
| After decisions | `aidd_observation` | Record significant learnings |
| At task boundaries | `aidd_session { update }` | Track progress |
| Before git commit | `aidd_generate_commit_message` + `aidd_ci_diff_check` | Validate changes |
| Before PR | `aidd_memory_export` | Export memory to Git |
| Conversation end | `aidd_session { end }` | Close session with outcome |

---

## 5. Getting Best Results

1. **Start every conversation with context** — Tell the AI what you're working on. The more specific your request, the better `aidd_start` classifies the task.

2. **Let the framework guide phases** — For complex features, the AI follows UNDERSTAND → PLAN → SPEC → BUILD → VERIFY → SHIP. Don't skip planning for non-trivial work.

3. **Review artifacts** — The AI creates plans, specs, and ADRs as versioned documents. Review them before implementation begins.

4. **Trust the memory** — If the AI references a past decision or convention, it came from recorded memory. This prevents repeating mistakes.

5. **Provide feedback** — When sessions end, the AI records your feedback. This drives framework evolution — positive feedback reinforces patterns, negative feedback triggers corrections.

---

## 6. File Structure

```
.aidd/                    Project AIDD state
├── config.json           Framework configuration
├── memory/               Exported memory (Git-visible)
│   ├── decisions.json    Architecture decisions
│   ├── mistakes.json     Errors and fixes
│   └── conventions.json  Project conventions
├── state/                Runtime state (gitignored)
│   ├── insights.md       Auto-generated dashboard
│   └── state-dump.sql    SQL state for debugging
└── aidd.db               SQLite database (gitignored)
```

---

## 7. MCP Tools Overview

The AIDD Engine exposes 71 tools organized by function:

| Category | Tools | Purpose |
|----------|-------|---------|
| **Project** | `aidd_start`, `aidd_detect_project`, `aidd_get_config` | Bootstrap and configuration |
| **Guidance** | `aidd_classify_task`, `aidd_suggest_next`, `aidd_apply_heuristics` | Task routing and decisions |
| **Knowledge** | `aidd_query_tkb`, `aidd_get_tkb_entry`, `aidd_tech_compatibility` | Technology research |
| **Agents** | `aidd_get_agent`, `aidd_get_competency_matrix` | Agent capabilities |
| **Routing** | `aidd_model_route`, `aidd_get_model_matrix`, `aidd_model_matrix_status` | Model selection |
| **Sessions** | `aidd_session`, `aidd_observation` | Session lifecycle |
| **Memory** | `aidd_memory_search/context/get`, `aidd_memory_add_*`, `aidd_memory_export` | Persistent memory |
| **Branches** | `aidd_branch` | Branch-level context |
| **Lifecycle** | `aidd_lifecycle_init/advance/status/list` | Phase tracking |
| **Evolution** | `aidd_evolution_analyze/status/review/revert` | Self-improvement |
| **Analytics** | `aidd_model_performance/compare/recommend` | Model analytics |
| **Patterns** | `aidd_pattern_audit/list/add/stats/score/false_positive` | Output quality |
| **Drafts** | `aidd_draft_create/list/approve` | Content management |
| **Artifacts** | `aidd_artifact` | Workflow documents |
| **Validation** | `aidd_validate_*`, `aidd_audit_*`, `aidd_scan_secrets` | Code quality |
| **Enforcement** | `aidd_check_compliance`, `aidd_verify_version`, `aidd_explain_violation` | Rule enforcement |
| **Execution** | `aidd_generate_commit_message`, `aidd_plan_migration` | Development tasks |
| **CI** | `aidd_ci_report`, `aidd_ci_diff_check`, `aidd_check_quality_gates` | CI/CD integration |
| **Context** | `aidd_optimize_context`, `aidd_get_routing_table` | Context management |
| **Health** | `aidd_project_health`, `aidd_diagnose_error` | Diagnostics |
| **Scaffold** | `aidd_scaffold` | Framework initialization |

---

## 8. Cross-References

- **AIDD Protocol**: `CLAUDE.md`
- **AIDD Lifecycle**: `content/specs/aidd-lifecycle.md`
- **Memory Layer**: `content/specs/memory-layer.md`
- **Model Matrix**: `content/specs/model-matrix.md`
- **Orchestrator Rules**: `content/rules/orchestrator.md`
- **Claude Code Adapter**: `adapters/claude/README.md`
- **MCP Architecture**: `mcps/README.md`
