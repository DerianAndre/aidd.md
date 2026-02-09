# AIDD MCP — Context Hydration Vector

archChecksum: 40604e85648a6ac7d8bafd13150210a42d016a4bf594bb8007f90ad2c96688a5
toolCount: 72
lastMutation: 2026-02-09

## Architecture
Engine (single process) ← Core(17) + Memory(36) + Tools(19) = 72 tools, 21 modules

## Storage
SQLite WAL | 15 tables + 2 FTS5 | FK pragma ON (soft relations) | busy_timeout=5000

## Memory Layers
L1 Session → L2 Observation(FTS5) → L3 Branch → L4 Permanent → L5 Evolution

## Constants
autoApply: >=90 | draft: 70-89 | pending: <70
circuitBreaker: 3 failures | analysis: every 5th session | prune: every 10th

## Files
- [mcp-map.md](mcp-map.md) — 72 tools across 21 modules
- [sql-schema.md](sql-schema.md) — 15 tables + 2 FTS5
- [pattern-signatures.md](pattern-signatures.md) — pattern detection system
- [memory-handover.md](memory-handover.md) — 5 hooks, memory lifecycle
