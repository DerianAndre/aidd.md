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

The Orchestrator (specs/aidd-lifecycle.md) classifies each task, then consults this file:

1. **AIDD Mode**: If `AGENTS.md` + `rules/` + `skills/` detected in the project → map directly to AIDD skills/workflows
2. **Fallback Mode**: If no AIDD → match task keywords to local templates in `templates/`
3. **Composition**: Multi-domain tasks load all relevant templates; use highest effort tier

---

## 2. AIDD Mode

When the project has AIDD installed (detected by presence of `AGENTS.md` + `rules/` + `skills/` + `workflows/`), tasks map directly to AIDD agents and workflows:

| Task Pattern                             | AIDD Agent          | AIDD Workflow                   |
| ---------------------------------------- | ------------------- | ------------------------------- |
| Architecture design, system boundaries   | System Architect    | audit.md                        |
| API contracts, OpenAPI, REST/GraphQL     | Contract Architect  | —                               |
| Database schema, migrations, queries     | Data Architect      | —                               |
| Design system, tokens, UI patterns       | Design Architect    | design.md                       |
| Frontend architecture, performance       | Experience Engineer | —                               |
| UI components, implementation            | Interface Artisan   | design.md                       |
| Testing strategy, coverage, generation   | Quality Engineer    | test.md                         |
| Security audit, OWASP, hardening         | Security Architect  | analyze.md                      |
| CI/CD, deployment, infrastructure        | Platform Engineer   | —                               |
| Documentation, guides, knowledge         | Knowledge Architect | docs.md                         |
| Internationalization, translations       | i18n Specialist     | —                               |
| Full feature (multi-domain)              | Orchestrator        | feature-branch.md               |
| Security hardening (comprehensive)       | Orchestrator        | audit.md                        |
| Documentation sync                       | Orchestrator        | docs.md                         |
| Technology selection, evaluation         | Orchestrator        | technology-selection.md         |
| Code review, pre-merge                   | Quality Engineer    | review.md                       |
| Brainstorming, ideation, diverge-converge | Orchestrator       | brainstorming.md                |
| Plan creation, ADR, spec commitment       | Orchestrator       | planning.md                     |
| Plan execution, implementation            | Orchestrator       | executing.md                    |
| Hexagonal, DDD, clean architecture        | System Architect   | cdh-architecture.md             |
| Product spec, Gherkin, Definition of Ready | Orchestrator      | product.md                      |
| Architect mode (brainstorm→plan→execute)  | Orchestrator       | orchestrator.md                 |

**AIDD takes priority**. When detected, AIDD agents and workflows are the SSOT. Templates serve as supplementary reference only.

---

## 3. Fallback Mode

When no AIDD is detected, match task keywords to local templates.

> **Note**: Most domain-specific templates have been absorbed into rules/, skills/, and workflows/. The remaining templates are standalone protocols that don't map to a single rule or skill.

### Available Templates (5)

| Domain              | Keywords                                                                                                                                    | Template               | Default Tier |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------ |
| Brainstorming       | brainstorm, ideas, plan, design, explore, trade-offs, options, new feature, build, create, add, improve, enhance, ideate, redesign, rethink | brainstorming.md       | 1            |
| Research            | research, deep dive, investigate, landscape, comparison                                                                                     | research.md            | 1            |
| Penetration Testing | pentest, CTF, exploit, red team, attack surface, offensive                                                                                  | penetration-testing.md | 1            |
| Migration           | upgrade, migrate, breaking changes, version, deprecation                                                                                    | migration.md           | 1→2          |
| Full Lifecycle      | new feature, AIDD, from scratch, full implementation                                                                                        | specs/aidd-lifecycle.md | 1→2→3       |

### Absorbed Templates → New Locations

Domain-specific content has been absorbed into the AIDD framework:

| Domain              | Keywords                                                    | Now In                                | Type     |
| ------------------- | ----------------------------------------------------------- | ------------------------------------- | -------- |
| Analysis            | analyze, audit, review, profile, investigate                | `rules/orchestrator.md`               | Rule     |
| Frontend            | component, UI, layout, style, animation, form               | `rules/frontend.md`                   | Rule     |
| Backend             | API, endpoint, domain, service, module                      | `rules/backend.md`                    | Rule     |
| Database            | schema, migration, query, SQL, ORM, table                   | `rules/backend.md`                    | Rule     |
| Testing             | test, coverage, mock, TDD, e2e, unit                        | `rules/testing.md`                    | Rule     |
| Refactoring         | refactor, extract, rename, cleanup, simplify                | `rules/code-style.md`                 | Rule     |
| Performance         | optimize, profile, bundle, LCP, benchmark                   | `rules/performance.md`                | Rule     |
| Documentation       | document, docs, README, guide, changelog                    | `rules/documentation.md`              | Rule     |
| UX/UI               | design system, user flow, a11y, WCAG                        | `skills/design-architect/SKILL.md`    | Skill    |
| Copywriting/i18n    | copy, i18n, translate, error message, locale                | `skills/i18n-specialist/SKILL.md`     | Skill    |
| API Design          | OpenAPI, REST, GraphQL, contract-first                      | `skills/contract-architect/SKILL.md`  | Skill    |
| System Architecture | C4, ADR, system design, boundaries                          | `skills/system-architect/SKILL.md`    | Skill    |
| CI/CD + DevOps      | pipeline, CI, CD, Docker, K8s, monitoring                   | `skills/platform-engineer/SKILL.md`   | Skill    |
| Security Audit      | security, OWASP, vulnerability, hardening                   | `workflows/analyze.md`                | Workflow |
| Code Review         | review, pre-merge, PR review, quality gate                  | `workflows/review.md`                 | Workflow |
| Orchestrator        | architect, brainstorm+plan, full pipeline                   | `workflows/orchestrator.md`           | Workflow |

---

## 4. Composition Rules

### Multi-Domain Tasks

When a task spans multiple domains:
1. Load ALL relevant templates
2. Use the **highest** effort tier among loaded templates
3. Think from ALL sub-agent perspectives across templates
4. Follow the most structured process (typically AIDD lifecycle for complex multi-domain)

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

> **SSOT**: [specs/model-matrix.md](../specs/model-matrix.md)
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

| Tier         | Default Provider Priority                    |
| ------------ | -------------------------------------------- |
| 1 (HIGH)     | anthropic → openai → google → xai → deepseek |
| 2 (STANDARD) | anthropic → openai → google → mistral → meta |
| 3 (LOW)      | anthropic → google → mistral → meta          |

---

## Cross-References

- **Architect Mode orchestrator**: `workflows/orchestrator.md`
- **Model matrix**: `specs/model-matrix.md`
- **Orchestrator logic**: `rules/orchestrator.md`
- **Decision tree**: `rules/orchestrator.md (Section 4)`
- **AIDD lifecycle**: `specs/aidd-lifecycle.md`
- **BLUF-6 format**: `specs/bluf-6.md`
- **All skills**: `skills/*/SKILL.md`
- **All workflows**: `workflows/*.md`
- **All rules**: `rules/*.md`
