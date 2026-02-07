# Implementation Plan: SQLite-First Storage + Model-Aware Auto-Learning

> **Last Updated**: 2026-02-06
> **Status**: Implementation In Progress

---

## Table of Contents

1. [Overview](#1-overview)
2. [PR 1: SQLite Consolidation](#2-pr-1-sqlite-consolidation)
3. [PR 2: Pattern Killer + Auto-Learning](#3-pr-2-pattern-killer--auto-learning)
4. [File Manifest](#4-file-manifest)
5. [Execution Order](#5-execution-order)
6. [Verification](#6-verification)

---

## 1. Overview

Two-PR implementation:
- **PR 1**: Replace all JSON storage with SQLite. Migrate 5 modules. Delete JsonBackend.
- **PR 2**: Add Pattern Killer module (5 tools) + HookBus + auto-learning + model fingerprinting.

**Guiding principles**:
- Zero AI token overhead for learning (all server-side)
- `ai/memory/insights.md` as primary communication channel
- Clean slate — no migrations, no legacy code
- Debounced analysis (every 5th session)
- Token usage is opt-in

---

## 2. PR 1: SQLite Consolidation

### Phase 1: Foundation (Sequential)

| Step | File | Action |
|------|------|--------|
| 1.1 | `packages/shared/src/types.ts` | Add `TokenUsage`, `ModelFingerprint`, extend `SessionState`, `SessionOutcome`, expand `StorageBackend` (~30 methods) |
| 1.2 | `mcps/mcp-aidd-memory/src/storage/migrations.ts` | Rewrite as single `SCHEMA` with 16 tables (incl. `meta`) |
| 1.3 | `mcps/mcp-aidd-memory/src/storage/sqlite-backend.ts` | Implement all new methods + checkpoint() + pruneStaleData() + schema checksum |
| 1.4 | `mcps/mcp-aidd-memory/src/storage/storage-provider.ts` | Direct SqliteBackend (no factory) |
| 1.5 | `mcps/mcp-aidd-memory/src/storage/json-backend.ts` | DELETE |
| 1.5 | `mcps/mcp-aidd-memory/src/storage/factory.ts` | DELETE |
| 1.6 | Build shared | `pnpm --filter @aidd.md/mcp-shared run build` |

### Phase 2: Module Migration (Parallel where possible)

| Step | Module | Key Changes |
|------|--------|-------------|
| 2.1 | `branch/index.ts` | JSON helpers → backend.saveBranch/getBranch/listBranches |
| 2.2 | `evolution/index.ts` | pending.json/log.json → backend methods |
| 2.3 | `drafts/index.ts` | Accept StorageProvider, content in DB column |
| 2.4 | `lifecycle/index.ts` | Accept StorageProvider, use lifecycle_sessions table |
| 2.5 | `memory/permanent-memory.ts` | Read/write via backend, add exportToJson() |
| 2.6 | `memory/index.ts` | Add aidd_memory_export tool |
| 2.7 | `diagnostics/index.ts` | Query backend instead of JSON |
| 2.8 | `session/index.ts` | Add tokenUsage merge logic |
| 2.9 | `modules/index.ts` | Pass provider to lifecycle + drafts |

Steps 2.1-2.4 can run in parallel (independent modules).
Steps 2.5-2.9 run sequentially (dependencies).

### Phase 3: Cleanup

- Remove unused imports
- Move `better-sqlite3` to dependencies
- Build + verify all 5 packages

---

## 3. PR 2: Pattern Killer + Auto-Learning

### Phase 4: HookBus + Fingerprinting

| Step | File | Action |
|------|------|--------|
| 4.1 | `modules/hooks.ts` | Create HookBus with circuit breaker (named subscribers, 3-strike disable) |
| 4.2 | `session/index.ts` | Emit session_ended, compute fingerprint |
| 4.3 | `observation/index.ts` | Emit observation_saved |

### Phase 5: Pattern Killer Module

| Step | File | Action |
|------|------|--------|
| 5.1 | `pattern-killer/types.ts` | BannedPattern, PatternDetection, AuditScore, ModelPatternProfile |
| 5.2 | `pattern-killer/detector.ts` | AI_PATTERN_SIGNATURES + computeFingerprint + detectPatterns |
| 5.3 | `pattern-killer/index.ts` | 6 tools: audit, list, add, stats, score, false_positive |

### Phase 6: Auto-Learning Hooks

| Step | What | Where |
|------|------|-------|
| 6.1 | Auto pattern detection on observation save | pattern-killer hook |
| 6.2 | Auto evolution analysis (debounced) | evolution hook |
| 6.3 | Feedback loop on session end | evolution hook |
| 6.4 | Auto model profile update | pattern-killer hook |
| 6.5 | Auto-generate insights.md (atomic write) | evolution hook |
| 6.6 | Auto-generate state-dump.sql (atomic write) | evolution hook |
| 6.7 | Auto-prune stale data (every 10th session) | evolution hook |
| 6.8 | 3 new evolution detectors | analyzer.ts |
| 6.9 | Extended ModelMetrics | analytics module |

### Phase 7: Cleanup + Verify

---

## 4. File Manifest

### Deleted (2 files)
- `mcps/mcp-aidd-memory/src/storage/json-backend.ts`
- `mcps/mcp-aidd-memory/src/storage/factory.ts`

### Created (4 files)
- `mcps/mcp-aidd-memory/src/modules/hooks.ts`
- `mcps/mcp-aidd-memory/src/modules/pattern-killer/types.ts`
- `mcps/mcp-aidd-memory/src/modules/pattern-killer/detector.ts`
- `mcps/mcp-aidd-memory/src/modules/pattern-killer/index.ts`

### Modified (20 files)
- `packages/shared/src/types.ts`
- `mcps/mcp-aidd-memory/src/storage/migrations.ts`
- `mcps/mcp-aidd-memory/src/storage/sqlite-backend.ts`
- `mcps/mcp-aidd-memory/src/storage/storage-provider.ts`
- `mcps/mcp-aidd-memory/src/storage/types.ts`
- `mcps/mcp-aidd-memory/src/storage/index.ts`
- `mcps/mcp-aidd-memory/src/modules/branch/index.ts`
- `mcps/mcp-aidd-memory/src/modules/evolution/types.ts`
- `mcps/mcp-aidd-memory/src/modules/evolution/analyzer.ts`
- `mcps/mcp-aidd-memory/src/modules/evolution/index.ts`
- `mcps/mcp-aidd-memory/src/modules/drafts/index.ts`
- `mcps/mcp-aidd-memory/src/modules/lifecycle/index.ts`
- `mcps/mcp-aidd-memory/src/modules/memory/permanent-memory.ts`
- `mcps/mcp-aidd-memory/src/modules/memory/index.ts`
- `mcps/mcp-aidd-memory/src/modules/session/index.ts`
- `mcps/mcp-aidd-memory/src/modules/observation/index.ts`
- `mcps/mcp-aidd-memory/src/modules/analytics/types.ts`
- `mcps/mcp-aidd-memory/src/modules/analytics/index.ts`
- `mcps/mcp-aidd-memory/src/modules/diagnostics/index.ts`
- `mcps/mcp-aidd-memory/src/modules/index.ts`

### Auto-generated at runtime
- `.aidd/data.db` — SQLite database (16 tables incl. `meta`)
- `ai/memory/insights.md` — Auto-learning dashboard (atomic write)
- `ai/memory/state-dump.sql` — Internal state dump for git visibility

---

## 5. Execution Order

| Batch | Phase | Tasks | Parallelizable |
|-------|-------|-------|---------------|
| 1 | 1 | Types, schema, backend (incl. checkpoint, pruning, schema checksum) | No (sequential) |
| 2 | 2.1-2.4 | Branch, evolution, drafts, lifecycle | Yes (parallel agents) |
| 3 | 2.5-2.9 | Memory, diagnostics, session, wiring | No (sequential) |
| 4 | 3 | Cleanup + verify PR 1 | No |
| 5 | 4 | HookBus (circuit breaker) + fingerprinting | No |
| 6 | 5 | Pattern-killer module (6 tools) | No |
| 7 | 6 | Auto-learning hooks + detectors + pruning + atomic writes | No |
| 8 | 7 | Cleanup + verify PR 2 | No |

---

## 6. Verification

### PR 1 Checks
- [ ] `pnpm mcp:typecheck` — 5/5 pass
- [ ] `pnpm mcp:build` — 5/5 pass
- [ ] `pnpm mcp:check` — Engine ON
- [ ] No readJsonFile/writeJsonFile in module code
- [ ] `.aidd/data.db` contains all 16 tables (incl. `meta`)
- [ ] Schema checksum stored in `meta` table
- [ ] WAL checkpoint called on session end
- [ ] All 16 memory tools functional

### PR 2 Checks
- [ ] 6 pattern-killer tools registered (audit, list, add, stats, score, false_positive)
- [ ] HookBus fires on session end + observation save
- [ ] HookBus circuit breaker disables after 3 consecutive failures
- [ ] Pattern detections saved with modelId
- [ ] Fingerprint computed at session end
- [ ] Evolution runs every 5th session
- [ ] Feedback adjusts confidence
- [ ] False positive reduces pattern confidence by 15%
- [ ] Patterns auto-deactivate below 50% confidence
- [ ] DB pruning runs every 10th session
- [ ] `ai/memory/insights.md` auto-generated (atomic write)
- [ ] `ai/memory/state-dump.sql` auto-generated
- [ ] `pnpm mcp:typecheck && pnpm mcp:build` — clean
