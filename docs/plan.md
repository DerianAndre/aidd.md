# ESP-1 Implementation Plan

## Overview

This plan operationalizes ADR-001 into a phased, delivery-ready program focused on reliability, parity, and antifragility in the AIDD MCP ecosystem.

- Program: Ecosystem Stabilization Program (ESP-1)
- Target horizon: 4-6 weeks
- Delivery mode: incremental, test-first on control-plane changes
- Priority order: data integrity -> policy integrity -> docs integrity -> resilience -> performance

## Objectives

1. Eliminate schema/runtime drift risk.
2. Guarantee centralized promotion governance.
3. Align fast-track behavior across classifier, startup, and hooks.
4. Enforce deterministic `docs/ai` parity in CI.
5. Improve runtime resilience and query efficiency.
6. Establish a baseline automated test safety net.

## Workstreams

### W1. Storage Integrity and Migrations

- Goal: move from hash-warning model to real forward migrations.
- Primary files:
  - `mcps/mcp-aidd-memory/src/storage/migrations.ts`
  - `mcps/mcp-aidd-memory/src/storage/sqlite-backend.ts`
  - `packages/shared/src/types.ts` (if migration metadata types are needed)
- Tasks:
  1. Add migration registry with ordered IDs (for example `001_init`, `002_artifacts`, ...).
  2. Add `schema_version` storage in `meta`.
  3. Execute pending migrations in a transaction during backend init.
  4. Fail initialization on migration failure and emit actionable error.
  5. Add backup/snapshot strategy before applying pending migrations.
- Acceptance criteria:
  - Existing DBs upgrade to latest schema automatically.
  - Missing tables/columns are repaired by migration path.
  - No startup success if migration leaves partial state.

### W2. Evolution Promotion Governance

- Goal: enforce one promotion policy path with mandatory shadow checks.
- Primary files:
  - `mcps/mcp-aidd-memory/src/modules/evolution/index.ts`
  - `mcps/mcp-aidd-memory/src/modules/evolution/analyzer.ts`
  - `mcps/mcp-aidd-memory/src/modules/pattern-killer/index.ts`
- Tasks:
  1. Introduce `promoteCandidate()` orchestration function.
  2. Route manual analyze flow and auto-hook flow through same gate.
  3. Require shadow test for all `model_pattern_ban` promotions.
  4. Persist metadata: `shadowTested`, `falsePositiveRate`, `sampleSize`, `testedAt`.
  5. Add rejection cooldown behavior to shared policy, not ad hoc branch logic.
- Acceptance criteria:
  - No pattern promotion path bypasses shadow gate.
  - All promoted pattern candidates have shadow metadata attached.

### W3. Fast-Track Policy Unification

- Goal: remove hook/runtime policy drift for low-complexity sessions.
- Primary files:
  - `mcps/mcp-aidd-core/src/modules/routing/index.ts`
  - `mcps/mcp-aidd-core/src/modules/bootstrap/index.ts`
  - `mcps/mcp-aidd-memory/src/modules/session/index.ts`
  - `scripts/hooks/on-session-init.cjs`
  - `scripts/hooks/on-plan-enter.cjs`
- Tasks:
  1. Persist classifier-derived fast-track decision to session data.
  2. Make hooks read persisted decision instead of recomputing from partial fields.
  3. Align guardrails: tier, risk keywords, phase constraints.
  4. Ensure startup output reflects same effective policy.
- Acceptance criteria:
  - Same input classification yields same behavior in classifier, startup, and hooks.
  - No mandatory brainstorm warning for valid fast-track sessions unless risk guard triggers.

### W4. S2D Documentation Parity Hardening

- Goal: guarantee docs reflect source-of-truth.
- Primary files:
  - `scripts/generate-mcp-docs.ts`
  - `docs/ai/index.md`
  - `docs/ai/mcp-map.md`
  - `docs/ai/pattern-signatures.md`
  - CI pipeline config (where `pnpm mcp:docs:check` is enforced)
- Tasks:
  1. Regenerate docs after stabilization changes.
  2. Extend generator extraction for newly added scoring dimensions/metadata.
  3. Treat generated docs as immutable outputs.
  4. Add/strengthen CI gate: fail on stale checksum.
- Acceptance criteria:
  - `pnpm mcp:docs:check` passes on mainline.
  - Tool counts and scoring descriptors are synchronized with source.

### W5. HookBus Reliability

- Goal: prevent silent degradation in subscriber workflows.
- Primary files:
  - `mcps/mcp-aidd-memory/src/modules/hooks.ts`
  - `mcps/mcp-aidd-memory/src/modules/session/index.ts`
  - `mcps/mcp-aidd-memory/src/modules/observation/index.ts`
  - `mcps/mcp-aidd-memory/src/modules/analytics/index.ts` (optional telemetry integration)
- Tasks:
  1. Add bounded retry with exponential or staged backoff.
  2. Add dead-letter queue/log for permanently failing events.
  3. Add status telemetry API/path for subscriber health.
  4. Replace silent catch paths with tracked failures.
- Acceptance criteria:
  - Subscriber failures are observable and recoverable.
  - No hidden long-term disablement without telemetry record.

### W6. Query and Index Optimization

- Goal: reduce scans and temp sort overhead on high-frequency paths.
- Primary files:
  - `mcps/mcp-aidd-memory/src/storage/migrations.ts`
  - `mcps/mcp-aidd-memory/src/storage/sqlite-backend.ts`
- Tasks:
  1. Add composite indexes for common predicate + sort patterns.
  2. Validate query plans before/after for sessions, permanent_memory, evolution_log, drafts, audit scores.
  3. Decide FK strategy:
     - either add actual `REFERENCES` constraints, or
     - document intentional soft-FK design and adjust docs wording.
- Acceptance criteria:
  - Query plans show index-assisted paths for critical queries.
  - FK documentation matches real schema behavior.

### W7. Test Baseline for Control Plane

- Goal: make core invariants testable and protected.
- Primary files:
  - `mcps/mcp-aidd-memory/**/__tests__/*`
  - `mcps/mcp-aidd-core/**/__tests__/*`
  - `scripts/**` tests for docs generator parity where applicable
- Tasks:
  1. Migration upgrade path tests.
  2. Promotion gate and shadow enforcement tests.
  3. Fast-track parity tests (classifier + hook inputs).
  4. Docs generator extraction/parity tests.
- Acceptance criteria:
  - `pnpm mcp:test` no longer fails due to missing tests.
  - Critical guardrails have automated regression coverage.

## Milestones

### M1 (Week 1): Integrity Foundation

- Deliver W1 + minimal W7 migration tests.
- Exit gate:
  - startup upgrade path validated on seeded legacy DB fixture.
  - no schema mismatch warning without migration attempt.

### M2 (Week 2): Governance Lockdown

- Deliver W2 + W3 + associated tests.
- Exit gate:
  - all pattern promotions pass centralized gate.
  - fast-track parity validated across runtime and hooks.

### M3 (Week 3): Docs and Reliability

- Deliver W4 + W5.
- Exit gate:
  - docs parity gate green.
  - hook failure telemetry visible and actionable.

### M4 (Week 4): Performance and Hardening

- Deliver W6 + complete W7 baseline.
- Exit gate:
  - optimized query plans for key paths.
  - critical suite stable in CI.

## Verification Matrix

1. `pnpm mcp:typecheck`
2. `pnpm mcp:build`
3. `pnpm mcp:docs && pnpm mcp:docs:check`
4. `pnpm mcp:test`
5. Startup migration simulation on legacy DB fixture.
6. Pattern promotion simulation showing mandatory shadow metadata.
7. Fast-track hook simulation with low, moderate, and risky-low classifications.

## Risks and Mitigations

1. Migration bug corrupts local DB.
   - Mitigation: pre-migration snapshot + transactional migrations + fixture tests.
2. Shadow gate too strict causes false rejections.
   - Mitigation: minimum-sample threshold, logged false-positive rate, tunable threshold.
3. Hook reliability changes increase complexity.
   - Mitigation: keep implementation minimal (retry + dead-letter + status), avoid overengineering.
4. Index additions increase write overhead.
   - Mitigation: benchmark key write paths and keep index set limited to proven hot queries.

## RACI (Lightweight)

- Responsible: MCP platform maintainers
- Accountable: Repository maintainer
- Consulted: Hub maintainers, adapter maintainers
- Informed: Contributors using AIDD MCP in downstream projects

## Definition of Done

1. ADR decisions are implemented or consciously deferred with rationale.
2. All milestone exit gates pass.
3. CI enforces docs parity and control-plane tests.
4. Release notes include migration and behavior changes.
5. Post-release monitoring confirms no regression in startup/session workflows.
