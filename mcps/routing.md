# MCPs — Routing Index

> Quick reference for AIDD MCP server packages. The MCP ecosystem provides 63 tools across 5 packages for AI-driven development.

---

## Package Index

| Package | npm | Role | Tools | Description |
|---------|-----|------|-------|-------------|
| [mcp-aidd-engine](mcp-aidd-engine/) | `@aidd.md/mcp-engine` | Engine | 63 | All-in-one server — combines Core + Memory + Tools in a single process |
| [mcp-aidd-core](mcp-aidd-core/) | `@aidd.md/mcp-core` | Brain | 17 | Guidance, routing, knowledge — project detection, task classification, TKB queries, model routing |
| [mcp-aidd-memory](mcp-aidd-memory/) | `@aidd.md/mcp-memory` | Memory | 27 | Sessions, observations, search, branch context, lifecycle, analytics, evolution, drafts, diagnostics |
| [mcp-aidd-tools](mcp-aidd-tools/) | `@aidd.md/mcp-tools` | Hands | 19 | Validation, enforcement, execution, CI — rule checking, code generation, pipeline integration |
| [shared](../packages/shared/) | `@aidd.md/mcp-shared` | Library | — | Shared types, utilities, schemas, server factory, content loader |

---

## Architecture

**Engine mode** (recommended): Single process, all 63 tools via `@aidd.md/mcp-engine`. Direct inter-module function calls. Simpler setup and lower resource usage.

**Split mode**: Three separate processes (`mcp-core`, `mcp-memory`, `mcp-tools`). Use when you need resource isolation or only specific capabilities.

---

## Tool Breakdown by Module

### Core (17 tools) — The Brain

| Module | Tools | Purpose |
|--------|-------|---------|
| Project | `detect_project`, `get_config`, `bootstrap` | Project detection, configuration, scaffolding |
| Knowledge | `query_tkb`, `get_tkb_entry` | Technology Knowledge Base queries |
| Agents | `get_agent`, `competency_matrix` | Agent role lookup and skill matching |
| Routing | `classify_task`, `get_routing_table`, `aidd_model_route`, `aidd_get_model_matrix`, `aidd_model_matrix_status` | Task classification and model selection |
| Heuristics | `apply_heuristics`, `suggest_next`, `tech_compatibility` | Decision heuristics and compatibility checks |
| Context | `optimize_context`, `scaffold` | Context window optimization and project scaffolding |

### Memory (27 tools) — The Memory

| Module | Tools | Purpose |
|--------|-------|---------|
| Session | `aidd_session` (multi-action: start/update/end/get/list) | Session lifecycle management |
| Branch | `aidd_branch` (multi-action: get/save/promote/list/merge) | Branch context persistence |
| Memory | `aidd_memory_search`, `aidd_memory_context`, `aidd_memory_get` | 3-layer search pattern (index, timeline, detail) |
| Permanent | `aidd_memory_add_decision`, `aidd_memory_add_mistake`, `aidd_memory_add_convention`, `aidd_memory_prune` | Persistent project knowledge |
| Observation | `aidd_observation` | Session observation recording |
| Lifecycle | `aidd_lifecycle_get`, `aidd_lifecycle_init`, `aidd_lifecycle_advance`, `aidd_lifecycle_status`, `aidd_lifecycle_list` | ASDD phase management |
| Analytics | `aidd_model_performance`, `aidd_model_compare`, `aidd_model_recommend` | Model performance tracking |
| Evolution | `aidd_evolution_analyze`, `aidd_evolution_status`, `aidd_evolution_review`, `aidd_evolution_revert` | Self-evolving framework |
| Drafts | `aidd_draft_create`, `aidd_draft_list`, `aidd_draft_approve` | Draft management for evolution proposals |
| Diagnostics | `aidd_diagnose_error`, `aidd_project_health` | Error diagnosis and project health |

### Tools (19 tools) — The Hands

| Module | Tools | Purpose |
|--------|-------|---------|
| Validation | 11 validators | Rule validation, code style checks, schema compliance |
| Enforcement | 4 tools | Rule enforcement and auto-fix |
| Execution | 2 tools | Code generation and script execution |
| CI | 2 tools | CI/CD pipeline integration |

---

## Resources and Prompts (Core only)

| Type | Count | Items |
|------|-------|-------|
| Resources | 4 | `aidd://agents`, `aidd://knowledge/{name}`, `aidd://skills/{name}`, `aidd://spec/heuristics` |
| Prompts | 3 | `aidd_plan_task` (BLUF-6), `aidd_review_code` (rule-based), `aidd_start_feature` (ASDD lifecycle) |

---

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm mcp:setup` | Full setup: install + build + init `.aidd/` |
| `pnpm mcp:build` | Build all MCP packages |
| `pnpm mcp:check` | Single-line startup status |
| `pnpm mcp:doctor` | Full diagnostic with suggested fixes |
| `pnpm mcp:status` | Quick build status |

See [README.md](README.md) for full documentation and [PLAN.md](PLAN.md) for implementation roadmap.
