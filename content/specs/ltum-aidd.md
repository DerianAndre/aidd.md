# LTUM-AIDD Protocol

> Low Token Usage Mode for metadata-first development with explicit reset gates.
> **Status**: Active
> **Last Updated**: 2026-02-09

---

## 1. Objective

Reduce context/token overhead without losing correctness by defaulting to:

1. Metadata-first analysis
2. Selective line-range hydration
3. Hunk-only mutation
4. Explicit full-sync escalation

---

## 2. Operating Rules

1. Never read full files first. Start with symbol/index tools.
2. Never mutate with blind rewrites. Use patch hunks.
3. Run reset check before high-impact edits.
4. End sessions with token telemetry and workflow artifacts.

---

## 3. Tooling

### 3.1 Reset Check

Command:

```bash
pnpm ltum:reset-check
pnpm ltum:normalize-sessions
```

Hard reset conditions:

- Storage/schema-related files changed
- `packages/shared` changed together with runtime modules
- Tool/schema-relevant code changed without `docs/ai` sync

When hard reset is triggered:

1. Run `pnpm mcp:typecheck`
2. Run `pnpm mcp:build`
3. Run `pnpm mcp:docs:check`

Session hygiene:

- `pnpm ltum:normalize-sessions` repairs stale local states where `status='active'` but `endedAt` exists.
- Startup/resume hooks invoke normalization quietly before reporting session state.

### 3.2 Symbolic Navigation

```bash
pnpm ltum:symbol-map -- --path mcps/mcp-aidd-core --json
pnpm ltum:impact-scan -- --symbol aidd_start --path mcps
pnpm ltum:hydrate-range -- --file mcps/mcp-aidd-core/src/modules/bootstrap/index.ts --around 220 --radius 40
```

---

## 4. Hook Enforcement

- `scripts/hooks/pre-edit.cjs` enforces LTUM hard reset before `Edit|Write`.
- `scripts/hooks/pre-session-end.cjs` blocks session end if required artifacts/telemetry are missing.
- Hook checks are session-scoped by `session_id` for artifact integrity.

---

## 5. Context Blindness Controls

LTUM does not replace full sync; it defers it until risk requires it.

Reset triggers include:

- Cross-boundary shared/runtime mutation
- Schema/migration changes
- Docs parity drift for tool/schema changes
- Session hygiene anomalies (multiple active/stale sessions)

---

## 6. Daily Flow

1. Start session.
2. Run `pnpm ltum:reset-check`.
3. Work via symbol map + impact scan + range hydration.
4. Apply patch hunks.
5. Validate.
6. End session with telemetry and required artifacts.
