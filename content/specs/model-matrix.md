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
| Anthropic | Claude Opus 4.6 | `claude-opus-4-6` | 1M | $5 / $25 | active |
| OpenAI | o3 | `o3` | 200K | $2 / $8 | active |
| OpenAI | GPT-5.2 | `gpt-5.2` | 400K | $2 / $14 | active |
| Google | Gemini 3 Pro | `gemini-3-pro` | 1M | $2 / $12 | active |
| xAI | Grok 4.1 | `grok-4.1` | 256K | $3 / $15 | active |
| DeepSeek | DeepSeek V3 | `deepseek-v3` | 164K | $0.27 / $1.10 | active |

### Tier 2 — STANDARD (Implementation, Integration, Coding)

| Provider | Model | Model ID | Context | Cost (in/out per 1M tokens) | Status |
|----------|-------|----------|---------|----------------------------|--------|
| Anthropic | Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` | 1M | $3 / $15 | active |
| OpenAI | GPT-4.5 | `gpt-4.5` | 128K | $75 / $150 | active |
| Google | Gemini 2.5 Pro | `gemini-2.5-pro` | 1M | $1.25 / $10 | active |
| Meta | Llama 4 Maverick | `llama-4-maverick` | 128K | self-hosted | active |
| Mistral | Mistral Large | `mistral-large-latest` | 128K | $2 / $6 | active |

### Tier 3 — LOW (Boilerplate, Formatting, Simple Tasks)

| Provider | Model | Model ID | Context | Cost (in/out per 1M tokens) | Status |
|----------|-------|----------|---------|----------------------------|--------|
| Anthropic | Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | 200K | $1 / $5 | active |
| Google | Gemini 2.5 Flash | `gemini-2.5-flash` | 1M | $0 / $3 | active |
| Google | Gemini 2.5 Flash-Lite | `gemini-2.5-flash-lite` | 1M | $0 / $0 | active |
| Meta | Llama 4 Scout | `llama-4-scout` | 128K | self-hosted | active |
| Mistral | Mistral Small | `mistral-small-latest` | 32K | $0.10 / $0.30 | active |

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

### Parallel Dispatch Pattern

When multiple independent tasks exist in a phase, dispatch them simultaneously at appropriate tiers. The orchestrator manages dependency ordering: independent tasks run in parallel, dependent tasks wait for prerequisites.

```
Example — Phase 5 with 4 implementation steps:

  Step 1: Define domain entities (High)       → Opus subagent   ─┐
  Step 2: Create DB migration (Standard)      → Sonnet subagent   ├─ parallel
  Step 3: Add barrel exports (Low)            → Haiku subagent  ─┘
  Step 4: Implement use case (High)           → Opus subagent (after Step 1 completes)
```

**Rules**:
- Independent tasks (no shared state or sequential dependencies) run in parallel.
- Dependent tasks wait for their prerequisites to complete.
- Each subagent runs at its assigned tier — the orchestrator coordinates.
- On failure, escalate the failing task one tier higher and retry before blocking the pipeline.

---

## 7. Maintenance

### Commands

| Command | Purpose | Network |
|---------|---------|---------|
| `pnpm mcp:models:sync` | Validate markdown ↔ TypeScript sync, check deprecations | Offline |
| `pnpm mcp:models:update` | Dual-source consensus update (OpenRouter API + LiteLLM GitHub) | Online |
| `pnpm mcp:models:update --dry-run` | Preview changes without writing files | Online |
| `pnpm mcp:models:update --force` | Apply unverified and suspicious updates | Online |
| `pnpm mcp:doctor` | Includes model matrix sync check (quick) | Offline |

### Dual-Source Consensus System

The update script fetches model data from two independent sources and cross-validates before applying changes:

| Source | URL | Data |
|--------|-----|------|
| OpenRouter API | `https://openrouter.ai/api/v1/models` | Context windows, pricing, new model discovery |
| LiteLLM GitHub | `BerriAI/litellm/model_prices_and_context_window.json` | Context windows, pricing (per-token → per-1M) |

**Confidence levels:**

| Level | Condition | Auto-Update? |
|-------|-----------|--------------|
| **HIGH** | Both sources agree (within 15% context / 25% pricing) | Yes |
| **SUSPICIOUS** | Both agree, but change is >2x context or >3x pricing | No (use `--force`) |
| **CONFLICT** | Sources disagree beyond tolerance | No (manual review) |
| **UNVERIFIED** | Only one source has data | No (use `--force`) |

The magnitude check (SUSPICIOUS) catches cases where both sources match to the wrong model variant — e.g., both returning data for `gpt-4` instead of `gpt-4.5`.

### Cost-Based Tier Inference

New models discovered from tracked providers receive a **suggested tier** based on pricing data (no model name heuristics — names change across providers). The signal is output cost per 1M tokens:

| Output Cost (per 1M) | Suggested Tier | Cost Tier |
|----------------------|----------------|-----------|
| > $10 | 1 (HIGH) | $$$ |
| $2 – $10 | 2 (STANDARD) | $$ |
| < $2 | 3 (LOW) | $ |
| Free / self-hosted | 3 (LOW) | $ |

If only input cost is available, fallback thresholds: >$5 → T1, $1–$5 → T2, <$1 → T3.

These are **suggestions only** — never auto-applied. Human review is required because some models break the cost-capability correlation (e.g., DeepSeek V3 is Tier 1 quality at Tier 3 pricing).

### Update Workflow

1. Run `pnpm mcp:models:update --dry-run` to preview what changed
2. Review consensus updates, suspicious items, and conflicts
3. Run `pnpm mcp:models:update` to apply consensus-approved changes
4. For conflicts/suspicious items: manually edit this file, then mirror to `model-matrix.ts`
5. Run `pnpm mcp:models:sync` to verify sync
6. Run `pnpm mcp:typecheck && pnpm mcp:build` to rebuild

### When to Update

- A tracked provider announces a new model or deprecation
- `pnpm mcp:models:update` reports new models from tracked providers
- `pnpm mcp:models:sync` reports upcoming deprecations (< 30 days)
- Quarterly review as a minimum cadence

---

## Cross-References

- **Architect Mode**: `workflows/orchestrators/architect-mode.md` — phases, escalation rules, parallel dispatch
- **Routing Table**: `templates/routing.md` — task-to-agent/workflow/template mapping
- **CLAUDE.md**: `~/.claude/CLAUDE.md` — model intelligence tiers (Section 2)
- **MCP Tool**: `aidd_model_route` — programmatic routing via the model matrix
- **MCP Tool**: `aidd_get_model_matrix` — retrieve full matrix with optional filters
- **MCP Tool**: `aidd_model_matrix_status` — matrix health, deprecation alerts
- **MCP Analytics**: `aidd_model_recommend` — historical performance-based recommendations
- **MCP Classification**: `aidd_classify_task` — task description → tier assignment
