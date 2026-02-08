# AIDD MCP — Context Hydration Vector

archChecksum: 15ed84483a442339050618587efa7cd64fe062d9f8fc705f1b93b237679a953d
toolCount: 71
lastMutation: 2026-02-08

## Architecture
Engine (single process) ← Core(17) + Memory(35) + Tools(19) = 71 tools, 21 modules

## Storage
SQLite WAL | 15 tables + 2 FTS5 | FK=ON | busy_timeout=5000

## Memory Layers
L1 Session → L2 Observation(FTS5) → L3 Branch → L4 Permanent → L5 Evolution

## Constants
autoApply: >=90 | draft: 70-89 | pending: <70
circuitBreaker: 3 failures | analysis: every 5th session | prune: every 10th

## Files
- [mcp-map.md](mcp-map.md) — 71 tools across 21 modules
- [sql-schema.md](sql-schema.md) — 15 tables + 2 FTS5
- [pattern-signatures.md](pattern-signatures.md) — pattern detection system
- [memory-handover.md](memory-handover.md) — 5 hooks, memory lifecycle
