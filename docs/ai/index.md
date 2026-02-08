# AIDD MCP — Context Vector

## Architecture
Engine=aidd-engine (single process) composing 3 packages:
- mcp-aidd-core: 6 modules, 17 tools (bootstrap, knowledge, routing, guidance, context, scaffold)
- mcp-aidd-memory: 10 modules, 34 tools (session, branch, memory, observation, lifecycle, analytics, evolution, drafts, diagnostics, pattern-killer)
- mcp-aidd-tools: 4 modules, 19 tools (validation, enforcement, execution, ci)

**Total: 70 tools, 20 modules, 1 engine**

## Storage
SQLite (better-sqlite3), WAL mode, busy_timeout=5000ms, FTS5 (porter unicode61), 16 tables, 22 indexes, 6 triggers
File: .aidd/data.db | Schema: mcp-aidd-memory/src/storage/migrations.ts

## Memory Layers
Session→Observation→Branch→Permanent→Evolution

## Critical Path
aidd_start→aidd_session(start)→aidd_observation→aidd_memory_search

## Constants

| Key | Value |
|-----|-------|
| autoApplyThreshold | 90 |
| draftThreshold | 70 |
| analysisInterval | 5 sessions |
| pruneInterval | 10 sessions |
| pruneDetections | 30d |
| maxObs | 1K |
| maxSessionsIndexed | 50 |
| hookCircuitBreaker | 3 strikes |

## Cross-refs
→mcp-map.md →sql-schema.md →pattern-signatures.md →memory-handover.md
