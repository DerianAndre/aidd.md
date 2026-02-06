# Model Routing Matrix — SSOT

> Multi-provider model selection for AI-driven development.
> This is the Single Source of Truth for model tier assignments, cognitive profiles, and fallback chains.

**Last Updated**: 2026-02-06
**Status**: Living Document

---

## Table of Contents

1. [Tier Definitions](#1-tier-definitions)
2. [Provider Registry](#2-provider-registry)
3. [Cognitive Profiles](#3-cognitive-profiles)
4. [Fallback Chains](#4-fallback-chains)
5. [Deprecation Tracker](#5-deprecation-tracker)
6. [Task-to-Tier Quick Reference](#6-task-to-tier-quick-reference)

---

## 1. Tier Definitions

| Tier | Label | Effort | Cognitive Demand | Cost Range |
|------|-------|--------|------------------|------------|
| 1 | **HIGH** | Maximum reasoning | Architecture, nuanced reasoning, ambiguity resolution, creative ideation, complex debugging, security-critical code | $$$ |
| 2 | **STANDARD** | Balanced | Implementation, integration, standard coding, synthesis, moderate analysis, refactoring | $$ |
| 3 | **LOW** | Mechanical | Boilerplate, formatting, file operations, simple tests, git operations, i18n, copy | $ |

### Tier Selection Rule

Use the **minimum tier that produces correct output**. Escalate when:
- Subagent fails or produces incorrect output → retry one tier higher
- Task has unclear requirements or multiple valid approaches → Tier 1
- Code touches auth, crypto, user input, or external APIs → minimum Tier 2, prefer Tier 1
- Task blocks multiple downstream tasks → one tier higher than default

---

## 2. Provider Registry

### Tier 1 — HIGH (Architecture, Complex Reasoning, Security)

| Provider | Model | Model ID | Context | Cost (in/out per 1M tokens) | Status |
|----------|-------|----------|---------|----------------------------|--------|
| Anthropic | Claude Opus 4.6 | `claude-opus-4-6` | 200K | $15 / $75 | active |
| OpenAI | o3 | `o3` | 200K | $10 / $40 | active |
| OpenAI | GPT-5.2 | `gpt-5.2` | 128K | $10 / $30 | active |
| Google | Gemini 3 Pro | `gemini-3-pro` | 200K | $2 / $12 | active |
| xAI | Grok 4.1 | `grok-4.1` | 128K | ~$5 / $15 | active |
| DeepSeek | DeepSeek V3 | `deepseek-v3` | 128K | $0.27 / $1.10 | active |

### Tier 2 — STANDARD (Implementation, Integration, Coding)

| Provider | Model | Model ID | Context | Cost (in/out per 1M tokens) | Status |
|----------|-------|----------|---------|----------------------------|--------|
| Anthropic | Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` | 200K | $3 / $15 | active |
| OpenAI | GPT-4.5 | `gpt-4.5` | 128K | $5 / $15 | active |
| Google | Gemini 2.5 Pro | `gemini-2.5-pro` | 100K | $1.25 / $5 | active |
| Meta | Llama 4 Maverick | `llama-4-maverick` | 128K | self-hosted | active |
| Mistral | Mistral Large | `mistral-large-latest` | 128K | $2 / $6 | active |

### Tier 3 — LOW (Boilerplate, Formatting, Simple Tasks)

| Provider | Model | Model ID | Context | Cost (in/out per 1M tokens) | Status |
|----------|-------|----------|---------|----------------------------|--------|
| Anthropic | Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | 100K | $1 / $5 | active |
| Google | Gemini 2.5 Flash | `gemini-2.5-flash` | 100K | $0.075 / $0.30 | active |
| Google | Gemini 2.5 Flash-Lite | `gemini-2.5-flash-lite` | 100K | $0.10 / $0.40 | active |
| Meta | Llama 4 Scout | `llama-4-scout` | 128K | self-hosted | active |
| Mistral | Mistral Small | `mistral-small-latest` | 32K | $0.20 / $0.60 | active |

---

## 3. Cognitive Profiles

### Task Type to Tier Mapping

| Cognitive Domain | Keywords | Tier |
|-----------------|----------|------|
| Architecture | system design, C4, ADR, boundaries, domain modeling, aggregates | 1 |
| Complex Reasoning | ambiguity, trade-offs, multi-step analysis, root cause | 1 |
| Security | auth, crypto, input validation, OWASP, hardening, CVE | 1 |
| Complex Debugging | race conditions, state bugs, multi-layer, memory leaks | 1 |
| Planning | spec writing, acceptance criteria, risk analysis | 1 |
| Creative Ideation | brainstorming, product design, UX strategy | 1 |
| Implementation | CRUD, service methods, controller endpoints, API integration | 2 |
| Integration | HTTP clients, data mapping, adapter wiring | 2 |
| Standard Coding | UI components, moderate logic, database queries | 2 |
| Refactoring | extract, rename, split, decouple, clear patterns | 2 |
| Standard Testing | unit tests with mocks, straightforward integration tests | 2 |
| Boilerplate | barrel exports, re-exports, type declarations | 3 |
| Formatting | file moves, renames, formatting, config files | 3 |
| Mechanical | git operations, file archival, environment setup | 3 |
| Simple Testing | pure function tests, no mocks, obvious assertions | 3 |
| Copy & i18n | i18n key additions, copy updates, translations | 3 |

### Provider Cognitive Strengths

| Provider | Tier 1 Strength | Tier 2 Strength | Notes |
|----------|----------------|-----------------|-------|
| Anthropic | Long-context reasoning, architecture, safety | Best balanced coding | Largest context (200K) |
| OpenAI | Deep reasoning (o3), research-grade analysis | General-purpose chat | o3 excels at multi-step reasoning |
| Google | Cost-efficient reasoning | Strong code generation | Best price/performance ratio |
| xAI | Rapid iteration, creative tasks | — | Emerging provider |
| DeepSeek | Extremely cost-efficient reasoning | — | Best cost for Tier 1 tasks |
| Meta | — | Strong open-source coding | Self-hosted, zero API cost |
| Mistral | — | European compliance, multilingual | GDPR-friendly |

---

## 4. Fallback Chains

When a preferred provider is unavailable, fall back to the next provider **at the same tier** (never drop to a lower tier for quality-critical tasks).

### Tier 1 Fallback Priority

```
anthropic → openai → google → xai → deepseek
```

### Tier 2 Fallback Priority

```
anthropic → openai → google → mistral → meta
```

### Tier 3 Fallback Priority

```
anthropic → google → mistral → meta
```

### Escalation (Not Fallback)

If ALL providers at a tier are unavailable, escalate to the next higher tier:

```
Tier 3 unavailable → use Tier 2
Tier 2 unavailable → use Tier 1
Tier 1 unavailable → FAIL (no silent degradation)
```

---

## 5. Deprecation Tracker

| Provider | Model | Deprecation Date | Migrate To | Status |
|----------|-------|-----------------|------------|--------|
| OpenAI | GPT-4o | 2026-02-13 | GPT-4.5 | deprecated |
| OpenAI | GPT-4.1 | 2026-02-13 | GPT-4.5 | deprecated |
| OpenAI | GPT-4.1 mini | 2026-02-13 | GPT-4.5 | deprecated |
| OpenAI | o4-mini | 2026-02-13 | o3 | deprecated |
| OpenAI | GPT-5 (Instant/Thinking) | 2026-02-13 | GPT-5.2 | deprecated |
| Google | Gemini 2.0 Flash | 2026-03-31 | Gemini 2.5 Flash | deprecated |

---

## 6. Task-to-Tier Quick Reference

### Phase-to-Tier Default Mapping (Architect Mode)

| Phase | Default Tier | Rationale |
|-------|-------------|-----------|
| 0 — Intake | 1 | Classification requires contextual judgment |
| 1 — Brainstorm | 1 | Nuanced questioning, creative ideation |
| 2 — Research | 2 | Parallel searches, doc lookups, synthesis |
| 3 — Plan | 1 | Architecture decisions, acceptance criteria |
| 4 — Commit Plan | 3 | Mechanical git operations |
| 5 — Execute | Adaptive | Per-task complexity (see below) |
| 6 — Completion | Adaptive | Per-verification type (see below) |

### Adaptive Task Assignments (Phase 5)

**Tier 1 (escalate)**:
- Domain logic with invariants, aggregates, complex state machines
- Security-critical code (auth, crypto, input validation at boundaries)
- Architecture scaffolding (ports, adapters, module boundaries)
- Complex debugging (multi-layer, race conditions, state bugs)
- Performance-critical algorithms
- Complex test scenarios (integration tests with mocked boundaries, edge cases)

**Tier 2 (default)**:
- CRUD implementations, service methods, controller endpoints
- Standard API integration, HTTP clients, data mapping
- UI components with moderate logic
- Standard unit tests, straightforward integration tests
- Database queries, migrations with moderate logic
- Refactoring with clear patterns

**Tier 3 (delegate)**:
- Boilerplate files (barrel exports, re-exports, type declarations)
- Simple CRUD with no business logic
- Config files, environment setup
- Simple unit tests (pure functions, no mocks)
- File moves, renames, formatting
- Git operations, file archival
- i18n key additions, copy updates

### Adaptive Task Assignments (Phase 6)

| Task | Tier | Rationale |
|------|------|-----------|
| Run typecheck/lint | 3 | Mechanical — run command, report result |
| Run test suite | 3 | Mechanical — run command, report result |
| Analyze test failures | 2 → 1 | Depends on failure complexity; escalate if needed |
| Write missing tests (simple) | 3 | Pure functions, no mocks, obvious assertions |
| Write missing tests (complex) | 2 → 1 | Integration tests, mocked boundaries, edge cases |
| Update plan status | 3 | File edit — mechanical |
| Move files to done/ | 3 | File operation — mechanical |
| Draft commit message | 2 | Needs to summarize changes accurately |
| Create PR | 2 | Needs to write coherent summary and test plan |
| Final architecture review | 1 | Verify implementation matches architectural intent |

---

## Cross-References

- **Architect Mode**: `~/.claude/templates/architect-mode.md` — phases, escalation rules, parallel dispatch
- **Routing Table**: `templates/routing.md` — task-to-agent/workflow/template mapping
- **CLAUDE.md**: `~/.claude/CLAUDE.md` — model intelligence tiers (Section 2)
- **MCP Tool**: `aidd_model_route` — programmatic routing via the model matrix
- **MCP Analytics**: `aidd_model_recommend` — historical performance-based recommendations
- **MCP Classification**: `aidd_classify_task` — task description → tier assignment
