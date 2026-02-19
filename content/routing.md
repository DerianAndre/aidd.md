# AIDD — Framework Router

> The single entrypoint for AI-Driven Development. Load this file, state your task, and it routes everything.

**Last Updated**: 2026-02-19
**Version**: 1.0.0
**License**: MIT

---

## 1. How to Use

**Reference this file and paste your task.** The router classifies it and tells you what to load: rules, workflows, skills — everything needed for smart, automated execution.

**Protocol:**

1. Load `rules/global.md` (always — immutable constraints)
2. Load `rules/orchestrator.md` (task classification + intake logic)
3. Match your task against the **Dispatch Matrix** (Section 2)
4. Load the matched **workflow** file
5. Load the matched **skill** SKILL.md files
6. Load domain-specific **rules** (frontend.md, backend.md, etc.)

---

## 2. Task Dispatch Matrix

### AIDD Mode — Signal-to-Agent Mapping

When the project has AIDD installed (AGENTS.md + rules/ + skills/ + workflows/), tasks map directly to agents and workflows:

| Task Pattern | Agent | Workflow |
| --- | --- | --- |
| Architecture design, system boundaries | System Architect | `audit.md` |
| API contracts, OpenAPI, REST/GraphQL | Contract Architect | — |
| Database schema, migrations, queries | Data Architect | — |
| Design system, tokens, UI patterns | Design Architect | `design.md` |
| Frontend architecture, performance | Experience Engineer | — |
| UI components, implementation | Interface Artisan | `design.md` |
| Testing strategy, coverage, generation | Quality Engineer | `test.md` |
| Security audit, OWASP, hardening | Security Architect | `analyze.md` |
| CI/CD, deployment, infrastructure | Platform Engineer | — |
| Documentation, guides, knowledge | Knowledge Architect | `docs.md` |
| Internationalization, translations | i18n Specialist | — |
| Full feature (multi-domain) | Orchestrator | `feature-branch.md` |
| Security hardening (comprehensive) | Orchestrator | `audit.md` |
| Documentation sync | Orchestrator | `docs.md` |
| Technology selection, evaluation | Orchestrator | `technology-selection.md` |
| Code review, pre-merge | Quality Engineer | `review.md` |
| Brainstorming, ideation, diverge-converge | Orchestrator | `brainstorming.md` |
| Plan creation, ADR, spec commitment | Orchestrator | `planning.md` |
| Plan execution, implementation | Orchestrator | `executing.md` |
| Hexagonal, DDD, clean architecture | System Architect | `cdh-architecture.md` |
| Product spec, Gherkin, Definition of Ready | Orchestrator | `product.md` |
| Architect mode (brainstorm-plan-execute) | Orchestrator | `orchestrator.md` |

### Load Protocol by Task Type

| Task Domain | Rules to Load | Workflow | Primary Skills |
| --- | --- | --- | --- |
| Frontend | `global.md`, `orchestrator.md`, `frontend.md`, `interfaces.md` | `design.md` or `full-stack-feature.md` | interface-artisan, experience-engineer, design-architect |
| Backend | `global.md`, `orchestrator.md`, `backend.md` | `full-stack-feature.md` | system-architect, contract-architect, data-architect |
| Fullstack | `global.md`, `orchestrator.md`, `frontend.md`, `backend.md` | `full-stack-feature.md` | All skills via orchestrator |
| Testing | `global.md`, `orchestrator.md`, `testing.md` | `test.md` | quality-engineer |
| Security | `global.md`, `orchestrator.md`, `security.md` | `analyze.md` | security-architect |
| Documentation | `global.md`, `orchestrator.md`, `documentation.md` | `docs.md` | knowledge-architect |
| CI/CD | `global.md`, `orchestrator.md` | — | platform-engineer |
| i18n | `global.md`, `orchestrator.md` | — | i18n-specialist |
| Architecture | `global.md`, `orchestrator.md`, `backend.md` | `audit.md` or `cdh-architecture.md` | system-architect |
| Code Review | `global.md`, `orchestrator.md`, `code-style.md` | `review.md` | quality-engineer |
| Planning | `global.md`, `orchestrator.md` | `orchestrator.md` (full pipeline) | — |

### Fallback Mode — Templates

When no AIDD is detected, match task keywords to standalone templates:

| Domain | Keywords | Template | Default Tier |
| --- | --- | --- | --- |
| Brainstorming | brainstorm, ideas, plan, design, explore, trade-offs, options, new feature, build, create | `templates/brainstorming.md` | 1 |
| Research | research, deep dive, investigate, landscape, comparison | `templates/research.md` | 1 |
| Penetration Testing | pentest, CTF, exploit, red team, attack surface, offensive | `templates/penetration-testing.md` | 1 |
| Migration | upgrade, migrate, breaking changes, version, deprecation | `templates/migration.md` | 1-2 |
| Full Lifecycle | new feature, AIDD, from scratch, full implementation | `specs/aidd-lifecycle.md` | 1-2-3 |

### Absorbed Templates

Domain-specific content has been absorbed into the framework:

| Domain | Now In | Type |
| --- | --- | --- |
| Analysis | `rules/orchestrator.md` | Rule |
| Frontend | `rules/frontend.md` | Rule |
| Backend | `rules/backend.md` | Rule |
| Database | `rules/backend.md` | Rule |
| Testing | `rules/testing.md` | Rule |
| Refactoring | `rules/code-style.md` | Rule |
| Performance | `rules/performance.md` | Rule |
| Documentation | `rules/documentation.md` | Rule |
| UX/UI | `skills/design-architect/SKILL.md` | Skill |
| Copywriting/i18n | `skills/i18n-specialist/SKILL.md` | Skill |
| API Design | `skills/contract-architect/SKILL.md` | Skill |
| System Architecture | `skills/system-architect/SKILL.md` | Skill |
| CI/CD + DevOps | `skills/platform-engineer/SKILL.md` | Skill |
| Security Audit | `workflows/analyze.md` | Workflow |
| Code Review | `workflows/review.md` | Workflow |
| Orchestrator | `workflows/orchestrator.md` | Workflow |

### Composition Rules

When a task spans multiple domains:

1. Load ALL relevant rules, skills, and workflows
2. Use the **highest** effort tier among loaded components
3. Think from ALL sub-agent perspectives
4. Follow the most structured process (typically `workflows/orchestrator.md` for complex multi-domain)

**Tier Transitions:** `1-2` = high planning, standard execution. `1-2-3` = full lifecycle. `3-1` = escalation.

**Priority Resolution:**

1. User-specified override always wins
2. AIDD mode has priority over fallback mode
3. More specific keyword match wins over general
4. Higher tier wins in case of conflict
5. Composition (loading multiple) is preferred over picking one

---

## 3. Agent System: Hierarchy and Roles

### Master Orchestrator

**Purpose:** Entry point for all requests. Decomposes user intent, queries Technology Knowledge Base (TKB), maps optimal execution paths.
**Triggers:** All requests (first responder)
**Protocol:** `rules/orchestrator.md`
**Output:** Execution plans with evidence-based technology recommendations

### System Architect

**Purpose:** Complete system design, architecture analysis, technical debt assessment
**Skills:** `skills/system-architect/SKILL.md`
**Activation:** `/audit`, `/review`

### Fullstack Agent

**Purpose:** End-to-end implementation, complete features, integrations
**Skills:** Composite — coordinates all specialized skills via `workflows/full-stack-feature.md`
**Activation:** Development tasks, feature implementation

### Interface Artisan

**Purpose:** UI/UX components, WCAG accessibility, pixel-perfect implementation
**Skills:** `skills/interface-artisan/SKILL.md`
**Activation:** `/design`, `/visual-audit`

### Experience Engineer

**Purpose:** Frontend architecture, state management, performance optimization
**Skills:** `skills/experience-engineer/SKILL.md`
**Activation:** Frontend architecture tasks

### Design Architect

**Purpose:** Design systems, tokens, Figma-to-code pipelines
**Skills:** `skills/design-architect/SKILL.md`
**Activation:** Design system tasks

### Contract Architect

**Purpose:** OpenAPI 3.1 specs, API governance, contract-first development
**Skills:** `skills/contract-architect/SKILL.md`
**Activation:** API design tasks

### Data Architect

**Purpose:** SQL schemas, 3NF normalization, migration strategies
**Skills:** `skills/data-architect/SKILL.md`
**Activation:** Database design tasks

### Quality Engineer

**Purpose:** Test generation, coverage analysis, edge cases
**Skills:** `skills/quality-engineer/SKILL.md`
**Activation:** `/test`, `/analyze`

### Security Architect

**Purpose:** Security audits, vulnerability analysis, OWASP compliance
**Skills:** `skills/security-architect/SKILL.md`
**Activation:** `/audit --security`, vulnerability reviews

### Knowledge Architect

**Purpose:** Doc-code synchronization, knowledge codification, TKB curation
**Skills:** `skills/knowledge-architect/SKILL.md`
**Activation:** `/docs`, `/sync-docs`

### Platform Engineer

**Purpose:** CI/CD, infrastructure, deployment, monitoring
**Skills:** `skills/platform-engineer/SKILL.md`
**Activation:** Pipeline issues, deployment tasks

### i18n Specialist

**Purpose:** Internationalization patterns, translation workflows
**Skills:** `skills/i18n-specialist/SKILL.md`
**Activation:** i18n tasks, localization, translation

---

## 4. Workflow Orchestrators

Multi-agent coordination systems for complex, end-to-end tasks.

### Full-Stack Feature

**File:** `workflows/full-stack-feature.md`
**Complexity:** High | **Duration:** ~90 min | **Cost:** ~$0.32

End-to-end feature development from architecture to deployment.

1. system-architect (Tier 1) — C4 diagrams, ADRs
2. contract-architect (Tier 1) — OpenAPI spec
3. data-architect (Tier 2) — SQL schema
4. design-architect (Tier 2) — Design tokens
5. experience-engineer (Tier 2) — Component architecture
6. interface-artisan (Tier 3) — React components
7. quality-engineer (Tier 3) — Test suites
8. security-architect (Tier 1) — OWASP audit
9. platform-engineer (Tier 2) — CI/CD pipeline
10. knowledge-architect (Tier 3) — Documentation

### Security Hardening

**File:** `workflows/analyze.md`
**Complexity:** High | **Duration:** ~60 min | **Cost:** ~$0.31

OWASP Top 10 (2025) comprehensive security assessment. Phases: Scan - Identify - Remediate - Verify.

### Documentation Sync

**File:** `workflows/docs.md`
**Complexity:** Medium | **Duration:** ~30 min | **Cost:** ~$0.12

Comprehensive documentation update ensuring code-docs synchronization.

### When to Use Orchestrators

- **Complex features** requiring multiple skills → `full-stack-feature`
- **Pre-production** security validation → `analyze`
- **Before releases** ensure docs are current → `docs`
- **Major refactoring** requiring architecture + code + docs → `orchestrator.md` (full pipeline)

See [`specs/orchestrator.md`](specs/orchestrator.md) for orchestrator standards and creation guidelines.

---

## 5. Model Resolution

When a task is classified with a tier (1, 2, or 3), resolve to a specific model:

> **SSOT**: [specs/model-matrix.md](specs/model-matrix.md)
> **MCP Tool**: `aidd_model_route` — accepts `{ tier, provider?, task? }`, returns optimal model with fallback chain.

```
aidd_classify_task → tier (1/2/3)
  ↓
aidd_model_route → { recommended, alternatives, fallbackChain }
  ↓ (optionally)
aidd_model_recommend → historical performance override
```

| Tier | Default Provider Priority |
| --- | --- |
| 1 (HIGH) | anthropic - openai - google - xai - deepseek |
| 2 (STANDARD) | anthropic - openai - google - mistral - meta |
| 3 (LOW) | anthropic - google - mistral - meta |

---

## 6. Golden Rules

> These rules are **IMMUTABLE** and apply to all agents in all contexts.

1. **Evidence-First:** NEVER give opinions, ALWAYS demonstrate with logic, data, or fundamental principles.
2. **First Principles:** Deconstruct problems to their fundamental laws before proposing solutions.
3. **Pareto Efficiency:** Prioritize the 20% of effort that generates 80% of impact.
4. **Second-Order Effects:** Analyze the consequences of consequences before acting.
5. **Zero Bullshit:** Eliminate fluff, corporate speak, and condescending explanations.
6. **Anti-Bias Protocol:** Actively check for sunk cost, survivorship, and confirmation biases.
7. **Breaking Changes:** NEVER break compatibility without explicit consultation.
8. **Test-First for Logic:** ALWAYS write tests for critical business logic.
9. **Readability > Brevity:** Prioritize maintainable code over "clever" code.

---

## 7. System Map

```text
your-project/
├── AGENTS.md                        ← Operational protocol (startup, lifecycle, session end)
└── content/
    ├── routing.md                   ← YOU ARE HERE (Smart Router — Single Entrypoint)
    ├── rules/                       ← Domain-specific rules
    │   ├── routing.md               ← File index
    │   ├── global.md                ← Communication, style, core philosophy
    │   ├── orchestrator.md          ← Task classification, intake logic
    │   ├── backend.md               ← NestJS, DB, APIs, hexagonal architecture
    │   ├── frontend.md              ← React, Tailwind, UX, accessibility
    │   ├── testing.md               ← Vitest, coverage, AAA patterns
    │   ├── security.md              ← Security rules
    │   ├── code-style.md            ← Code conventions
    │   ├── documentation.md         ← Documentation standards
    │   ├── git-workflow.md          ← Git conventions
    │   ├── interfaces.md            ← Interface contracts
    │   ├── deliverables.md          ← Deliverable standards
    │   └── performance.md           ← Performance rules
    ├── skills/                      ← Specialized capabilities (SKILL.md + scripts)
    │   ├── routing.md               ← Skill index
    │   ├── competency-matrix.md     ← Agent competency breakdown
    │   ├── system-architect/        ← System design, C4 diagrams, ADRs
    │   ├── contract-architect/      ← OpenAPI 3.1 specs, API governance
    │   ├── data-architect/          ← SQL schemas, 3NF normalization
    │   ├── interface-artisan/       ← UI/UX, WCAG, React components
    │   ├── experience-engineer/     ← Frontend architecture, state, performance
    │   ├── design-architect/        ← Design systems, tokens, Figma→Code
    │   ├── quality-engineer/        ← Test generation, coverage, quality
    │   ├── security-architect/      ← Vulnerability scanning, OWASP audits
    │   ├── knowledge-architect/     ← Documentation sync, knowledge
    │   ├── platform-engineer/       ← CI/CD, infrastructure, deployment
    │   └── i18n-specialist/         ← Internationalization, next-intl
    ├── workflows/                   ← Step-by-step guides for complex tasks
    │   ├── routing.md               ← Workflow index
    │   ├── orchestrator.md          ← Full pipeline (brainstorm→plan→execute)
    │   ├── full-stack-feature.md    ← End-to-end feature development
    │   ├── analyze.md               ← Security & quality audit
    │   ├── audit.md                 ← Architecture validation
    │   ├── design.md                ← WCAG + Tailwind audit
    │   ├── docs.md                  ← Documentation sync
    │   ├── review.md                ← Pre-merge code review
    │   ├── test.md                  ← Test generation
    │   ├── feature-branch.md        ← Branch creation, PR workflow
    │   ├── product.md               ← Product spec, Gherkin, DoR
    │   ├── technology-selection.md   ← Technology evaluation
    │   ├── brainstorming.md         ← Structured ideation
    │   ├── planning.md              ← Plan creation + ADR
    │   ├── executing.md             ← Plan execution
    │   └── cdh-architecture.md      ← Clean/DDD/Hexagonal audit
    ├── specs/                       ← AIDD standard specifications
    │   ├── routing.md               ← Spec index
    │   ├── aidd-lifecycle.md        ← 6-phase lifecycle
    │   ├── model-matrix.md          ← Multi-provider model matrix
    │   ├── orchestrator.md          ← Orchestrator creation standards
    │   └── ...                      ← (heuristics, memory-layer, bluf-6, etc.)
    ├── templates/                   ← Standalone protocols
    │   ├── brainstorming.md         ← Brainstorm template (fallback)
    │   ├── research.md              ← Research template
    │   ├── penetration-testing.md   ← Pentest template
    │   └── migration.md             ← Migration template
    └── knowledge/                   ← Technology Knowledge Base (TKB)
        ├── routing.md               ← TKB category index
        └── ...                      ← (runtimes, frontend, backend, data, etc.)
```

---

## 8. Bootstrap Prompt

When starting a new session, use this prompt:

```
Read `content/routing.md` in the project and follow the Load Protocol (Section 1).
Match my task against the Dispatch Matrix (Section 2) and load the appropriate
rules, workflows, and skills. Confirm what you loaded before proceeding.
```

---

## Cross-References

- **Orchestrator protocol:** `rules/orchestrator.md`
- **Full orchestrator pipeline:** `workflows/orchestrator.md`
- **AIDD lifecycle:** `specs/aidd-lifecycle.md`
- **Model matrix:** `specs/model-matrix.md`
- **BLUF-6 format:** `specs/bluf-6.md`
- **All skills:** `skills/*/SKILL.md`
- **All workflows:** `workflows/*.md`
- **All rules:** `rules/*.md`
