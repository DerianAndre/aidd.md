# AIDD MCP — Context Hydration Vector

archChecksum: 2673c298d70d9c417fd6785b4c7ce577fc204ce7373308c483a97d6939d9dc43
toolCount: 82
lastMutation: 2026-02-18

## Architecture
Engine (single process) ← Core(17) + Memory(46) + Tools(19) = 82 tools, 21 modules

## Storage
SQLite WAL | 15 tables + 2 FTS5 | FK pragma ON (soft relations) | busy_timeout=5000

## Memory Layers
L1 Session → L2 Observation(FTS5) → L3 Branch → L4 Permanent → L5 Evolution

## Constants
autoApply: >=90 | draft: 70-89 | pending: <70
circuitBreaker: 3 failures | analysis: every 5th session | prune: every 10th

## Files
- [mcp-map.md](mcp-map.md) — 82 tools across 21 modules
- [sql-schema.md](sql-schema.md) — 15 tables + 2 FTS5
- [pattern-signatures.md](pattern-signatures.md) — pattern detection system
- [memory-handover.md](memory-handover.md) — 5 hooks, memory lifecycle
