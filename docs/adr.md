# ADR-001: Goal 1 - Eliminate Schema/Runtime Drift with Versioned Forward Migrations

- Status: Proposed
- Date: 2026-02-09
- Goal: ESP-1 Objective 1 (`Eliminate schema/runtime drift risk`)
- Scope: `mcps/mcp-aidd-memory`, startup path, and dependent module bootstrap

## Context

Current behavior allows drift between expected schema and live databases:

1. Startup detects schema hash mismatch but does not always perform forward repair.
2. Tool modules can initialize against partially outdated schemas and fail later at runtime.
3. Schema features can appear in one DB context but not another, causing inconsistent behavior across clients.
4. Existing control-plane reliability depends on deterministic storage invariants that are not strictly enforced today.

Goal 1 requires a fail-safe, deterministic upgrade path for all supported DB states.

## Decision

Adopt versioned, transactional forward migrations as the mandatory startup gate.

### D1. Schema version is authoritative

- Add `schema_version` in `meta`.
- Keep schema hash as integrity telemetry, not as the primary upgrade mechanism.
- Runtime compatibility is determined by migration level, not by warning-only checks.

### D2. Ordered migration registry

- Define ordered migration steps (for example `001_init`, `002_artifacts`, `003_indexes`, ...).
- Each migration is idempotent and safe to re-run.
- Migrations must include indexes/triggers required by query paths, not only tables.

### D3. Startup migration gate (fail-closed)

Startup sequence must be:

1. Open DB and read `schema_version`.
2. If pending migrations exist, create pre-migration snapshot/backup.
3. Run all pending migrations in a single transaction.
4. Run post-migration integrity checks for required tables/columns/indexes.
5. Commit only on full success.
6. Expose tools/modules only after migration gate passes.

If migration fails at any step, startup fails with actionable diagnostics. No partial-success mode.

### D4. No implicit downgrade path

- Downgrade is not automatic.
- Rollback is operational (restore backup / pin version), not in-place destructive reverse SQL.

## Consequences

### Positive

- Deterministic startup behavior across environments.
- Eliminates class of runtime failures caused by stale schema.
- Creates a stable base for remaining ESP-1 goals.

### Tradeoffs

- Slight startup overhead when migrations are pending.
- Requires migration test fixtures and long-term migration maintenance discipline.

## Alternatives Considered

### A1. Keep hash-warning model

- Rejected: detects drift but does not repair drift.

### A2. Recreate DB on mismatch

- Rejected: destructive for historical/session/permanent memory data.

### A3. Lazy module-level migrations

- Rejected: fragments responsibility and reintroduces non-deterministic bootstrap behavior.

## Implementation Plan (Goal 1 Only)

1. Add migration registry and `schema_version` support in storage init.
2. Add transactional migration runner + integrity validator.
3. Add backup-on-upgrade policy for local DB before applying pending migrations.
4. Update startup/module initialization so tool registration occurs only after migration success.
5. Add tests:
   - legacy DB -> latest DB upgrade
   - failed migration rolls back atomically
   - required schema objects present post-upgrade

## Acceptance Criteria

1. Any supported older DB upgrades automatically to latest schema.
2. No tool execution occurs when migration fails.
3. Post-upgrade checks confirm required schema objects before startup completes.
4. Regression tests cover success and rollback paths.

## Rollback Plan

1. Stop service on migration failure.
2. Restore backup created immediately before migration attempt.
3. Pin to last known-good package while patching migration script.

## Non-Goals

1. Evolution policy refactors (Goal 2).
2. Fast-track orchestration changes (Goal 3).
3. S2D docs parity hardening beyond migration-related fields (Goal 4+).
