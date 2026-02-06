# Task Routing — Template & AIDD Skill Mapping

> Dual-mode routing: AIDD skills (when AGENTS.md detected) or fallback templates (when not).

**Last Updated**: 2026-02-06
**Status**: Living Document

---

## Table of Contents

1. [How Routing Works](#1-how-routing-works)
2. [AIDD Mode](#2-aidd-mode)
3. [Fallback Mode](#3-fallback-mode)
4. [Composition Rules](#4-composition-rules)

---

## 1. How Routing Works

The Orchestrator (spec/asdd-lifecycle.md) classifies each task, then consults this file:

1. **AIDD Mode**: If `AGENTS.md` + `rules/` + `skills/` detected in the project → map directly to AIDD skills/workflows
2. **Fallback Mode**: If no AIDD → match task keywords to local templates in `templates/`
3. **Composition**: Multi-domain tasks load all relevant templates; use highest effort tier

---

## 2. AIDD Mode

When the project has AIDD installed (detected by presence of `AGENTS.md` + `rules/` + `skills/` + `workflows/`), tasks map directly to AIDD agents and workflows:

| Task Pattern | AIDD Agent | AIDD Workflow |
|---|---|---|
| Architecture design, system boundaries | System Architect | audit.md |
| API contracts, OpenAPI, REST/GraphQL | Contract Architect | — |
| Database schema, migrations, queries | Data Architect | — |
| Design system, tokens, UI patterns | Design Architect | design.md |
| Frontend architecture, performance | Experience Engineer | — |
| UI components, implementation | Interface Artisan | design.md |
| Testing strategy, coverage, generation | Quality Engineer | test.md |
| Security audit, OWASP, hardening | Security Architect | analyze.md |
| CI/CD, deployment, infrastructure | Platform Engineer | — |
| Documentation, guides, knowledge | Knowledge Architect | docs.md |
| Internationalization, translations | i18n Specialist | — |
| Full feature (multi-domain) | Orchestrator | feature-branch.md |
| Security hardening (comprehensive) | Orchestrator | audit.md |
| Documentation sync | Orchestrator | docs.md |
| Technology selection, evaluation | Orchestrator | technology-selection.md |
| Code review, pre-merge | Quality Engineer | review.md |
| Brainstorming, ideation | Orchestrator | product.md |
| Architect mode (brainstorm→plan→execute) | Orchestrator | orchestrators/architect-mode.md |

**AIDD takes priority**. When detected, AIDD agents and workflows are the SSOT. Templates serve as supplementary reference only.

---

## 3. Fallback Mode

When no AIDD is detected, match task keywords to local templates:

### Core Development

| Domain | Keywords | Template | Default Tier |
|--------|----------|---------|-------------|
| Brainstorming | brainstorm, ideas, plan, design, explore, trade-offs, options, new feature, build, create, add, improve, enhance, ideate, redesign, rethink | brainstorming.md | 1 |
| Analysis | analyze, audit, review, profile, investigate, diagnose | analysis.md | 1 |
| Refactoring | refactor, extract, rename, split, cleanup, simplify, decouple | refactoring.md | 1→2 |
| Frontend | component, UI, layout, style, animation, form, modal, page | frontend.md | 2 |
| Backend | API, endpoint, domain, aggregate, port, adapter, service, module | backend.md | 2 |
| Database | schema, migration, query, index, SQL, ORM, table, seed | database.md | 2 |
| Testing | test, coverage, mock, TDD, e2e, unit, integration, spec | testing.md | 3→1 |

### Design & Content

| Domain | Keywords | Template | Default Tier |
|--------|----------|---------|-------------|
| UX/UI | design system, user flow, a11y, WCAG, wireframe, prototype | ux-ui.md | 1 |
| Copywriting | copy, i18n, translate, error message, label, locale, microcopy | copywriting.md | 3 |
| Documentation | document, docs, README, guide, spec, changelog | documentation.md | 3→2 |

### Infrastructure & Security

| Domain | Keywords | Template | Default Tier |
|--------|----------|---------|-------------|
| CI/CD | pipeline, CI, CD, deploy, Docker, workflow, release | cicd.md | 2 |
| Security Audit | security, OWASP, vulnerability, audit, hardening, CVE | security-audit.md | 1 |
| Penetration Testing | pentest, CTF, exploit, red team, attack surface, offensive | penetration-testing.md | 1 |
| DevOps | Docker, K8s, monitoring, observability, infra, scaling | devops.md | 2 |

### Specialized

| Domain | Keywords | Template | Default Tier |
|--------|----------|---------|-------------|
| API Design | OpenAPI, REST, GraphQL, gRPC, contract-first, endpoints | api-design.md | 1→2 |
| System Architecture | C4, ADR, system design, architecture diagram, boundaries | system-architecture.md | 1 |
| Performance | optimize, profile, bundle, LCP, memory leak, benchmark | performance.md | 1→2 |
| Migration | upgrade, migrate, breaking changes, version, deprecation | migration.md | 1→2 |
| Code Review | review, pre-merge, PR review, quality gate, standards | code-review.md | 1 |
| Research | research, deep dive, investigate, landscape, comparison | research.md | 1 |
| Architect Mode | architect, architect-mode, brainstorm+plan, ideation-to-execution, full pipeline | orchestrators/architect-mode.md | 1→2→3 |
| Full Lifecycle | new feature, ASDD, from scratch, full implementation | ASDD inline (spec/asdd-lifecycle.md) | 1→2→3 |

---

## 4. Composition Rules

### Multi-Domain Tasks

When a task spans multiple domains:
1. Load ALL relevant templates
2. Use the **highest** effort tier among loaded templates
3. Think from ALL sub-agent perspectives across templates
4. Follow the most structured process (typically ASDD for complex multi-domain)

### Tier Transitions

Format `X→Y` means: starts at tier X for planning, transitions to tier Y for execution.
- `1→2`: High effort planning, standard effort execution
- `3→1`: Low effort for simple cases, escalates to high effort for complex cases
- `1→2→3`: Full lifecycle — high for planning, standard for implementation, low for tests/polish

### Priority Resolution

1. User-specified template always wins
2. AIDD mode has priority over fallback mode
3. More specific keyword match wins over general
4. Higher tier wins in case of conflict
5. Composition (loading multiple templates) is preferred over picking one

---

## 5. Model Resolution

When a task is classified with a tier (1, 2, or 3), resolve the tier to a specific model using the **Model Routing Matrix**:

> **SSOT**: [templates/model-matrix.md](model-matrix.md)
> **MCP Tool**: `aidd_model_route` — accepts `{ tier, provider?, task? }`, returns optimal model with alternatives and fallback chain.

### Resolution Flow

```
aidd_classify_task → tier (1/2/3)
  ↓
aidd_model_route → { recommended, alternatives, fallbackChain }
  ↓ (optionally)
aidd_model_recommend → historical performance override
```

### Quick Reference

| Tier | Default Provider Priority |
|------|--------------------------|
| 1 (HIGH) | anthropic → openai → google → xai → deepseek |
| 2 (STANDARD) | anthropic → openai → google → mistral → meta |
| 3 (LOW) | anthropic → google → mistral → meta |

---

## Cross-References

- **Architect Mode orchestrator**: `workflows/orchestrators/architect-mode.md`
- **Model matrix**: `templates/model-matrix.md`
- **Orchestrator logic**: `rules/orchestrator.md`
- **Decision tree**: `rules/decision-tree.md`
- **ASDD lifecycle**: `spec/asdd-lifecycle.md`
- **BLUF-6 format**: `spec/bluf-6.md`
- **All skills**: `skills/*/SKILL.md`
- **All workflows**: `workflows/*.md`
- **All rules**: `rules/*.md`
