# ADR: SQLite-First Storage + Model-Aware Auto-Learning

> Architecture Decision Record
> **Date**: 2026-02-06
> **Status**: Accepted
> **Deciders**: Project Lead + AI Architect

---

## Context

The AIDD MCP memory system (15 tools across 5 modules) uses a dual-storage architecture:
- **StorageBackend** (SQLite or JSON) — handles sessions, observations, search
- **Direct JSON I/O** — 5 modules bypass StorageBackend for branches, evolution, drafts, lifecycle, permanent memory

This creates data fragmentation, inconsistent sync, and limited search coverage. Additionally, the system has no way to learn from its own usage — model performance insights, AI pattern detection, and evolution analysis require explicit tool calls that cost AI tokens.

## Decision

### 1. SQLite as Single Source of Truth

**Consolidate all storage into a single SQLite database** (`.aidd/data.db`).

- Delete `JsonBackend` — `better-sqlite3` is universally available on Node 22
- Expand `StorageBackend` interface with ~30 methods covering all data types
- Migrate 5 modules from direct JSON to StorageBackend calls
- Permanent memory: SQLite is SSOT, JSON export on demand (`ai/memory/*.json`)
- Single `SCHEMA` with `IF NOT EXISTS` — no version checks, no migrations
- Schema checksum in `meta` table — warns on drift after `git pull`
- WAL checkpoint on session end — minimizes corruption window

**Why not keep JSON fallback?**
- `better-sqlite3` works on all Node 22 platforms (macOS, Linux, Windows)
- Maintaining two backends doubles implementation effort for zero benefit
- JSON backend can't do FTS5 full-text search, transactions, or atomic writes
- We're not in production — clean slate is simpler than dual support

### 2. Model-Aware Auto-Learning

**Add automatic learning behind the scenes** at zero AI token cost.

- **HookBus**: Lightweight event bus with circuit breaker (3-strike disable). Named subscribers for diagnostics
- **Pattern Killer**: 6 explicit tools + auto-detection via hooks. Regex patterns + statistical fingerprinting
- **Model fingerprinting**: Pure math (sentence length, type-token ratio, passive voice ratio, filler density) computed server-side
- **3 new evolution detectors**: context efficiency, model drift, model pattern frequency
- **Feedback loop**: User positive/negative feedback adjusts evolution candidate confidence (±5-15, gradual)

**Why server-side, not AI-driven?**
- All analysis runs in the Node.js MCP process — zero AI tokens consumed
- Regex pattern detection is deterministic and free
- Statistical fingerprinting is pure math (no LLM needed to judge LLM output)
- The system teaches the AI via markdown files, not via tool call responses

### 3. Filesystem as Communication Channel

**Auto-generate `ai/memory/insights.md`** — a compact dashboard the AI reads naturally.

- Written by auto-hooks after evolution analysis (every 5th session)
- Contains: model recommendations, pattern alerts, evolution candidates, drift warnings
- Capped at 200 lines (~150-200 tokens when read)
- Replaces 3 status tool calls (~700 tokens) with 1 file read (~150 tokens)
- Git-tracked — user sees evolution over time

**Why markdown, not tool calls?**
- Tool calls cost input + output tokens every time
- Markdown files are read once, included in context
- Aligns with AIDD's "plan via markdown" philosophy
- The AI reads `ai/memory/` naturally — no new behavior needed

### 4. Hardening (Cross-Cutting)

- **HookBus Circuit Breaker**: Named subscribers with 3-strike disable. Protects session latency from heavy hook failures.
- **Atomic File Writes**: All auto-generated files (.md, .sql) written via .tmp + `fs.renameSync()`. Prevents AI from reading partial files.
- **SQL State Dump**: `ai/memory/state-dump.sql` with INSERT statements — restores `git diff` visibility lost by removing JSON files.
- **Confidence Decay**: `aidd_pattern_false_positive` tool reduces pattern confidence by 15% per report. Auto-deactivate below 50%.
- **FTS5 Pruning**: Hard caps — 1000 observations, 50 sessions indexed. Pattern detections >30 days pruned. Auto-triggers every 10th session.
- **WAL Checkpoint**: Force flush on session end. Schema checksum in `meta` table detects drift.

## Consequences

### Positive
- Single source of truth — no data fragmentation
- FTS5 search covers all data types
- Atomic writes via SQLite transactions
- Zero-cost automatic learning
- ~500 tokens saved per session (insights.md vs tool calls)
- Model-specific pattern detection and evolution
- Statistical fingerprinting provides model identity without AI cost
- Schema checksum prevents silent DB/code drift
- Circuit breaker protects session latency from hook failures
- Atomic file writes prevent partial reads of insights.md

### Negative
- `better-sqlite3` becomes a hard dependency (no fallback)
- `.aidd/data.db` is a binary file (not diffable in git) — mitigated by `state-dump.sql` auto-dump
- HookBus adds minimal complexity to module wiring
- Auto-analysis every 5th session adds ~50-100ms latency (server-side)

### Risks
- SQLite corruption on unclean shutdown — mitigated by WAL mode + checkpoint on session end
- insights.md could grow beyond 200 lines — mitigated by hard cap + pruning
- Auto-learning could generate noisy evolution candidates — mitigated by confidence thresholds, debouncing, and false-positive reporting
- FTS5 index growth — mitigated by auto-pruning every 10th session (pattern_detections >30 days, observations >1K cap, 50 sessions max)

## Alternatives Considered

| Alternative | Why Rejected |
|------------|-------------|
| Keep JSON fallback | Double implementation effort, no FTS5, no transactions |
| Use tool calls for status | Costs ~700 tokens/session, requires AI to know when to call |
| LLM-based pattern detection | Circular dependency (LLM judging LLM), costs tokens |
| Pre-compute stats | Wastes CPU on data that may never be queried |
| Separate DB per module | More complex, can't do cross-module queries |
| Run analysis every session | O(n²) behavior as sessions accumulate |
