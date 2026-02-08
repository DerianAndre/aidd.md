# SQLite Schema (16 tables, 22 idx, 6 triggers)

PRAGMA: WAL, FK=ON, busy_timeout=5000

## Tables

| Table | PK | Key Columns | Notes |
|-------|-----|------------|-------|
| meta | key TEXT | value TEXT | schema checksum (SHA256[0:16]) |
| sessions | id TEXT | branch, started_at, ended_at, status, model_id, data(JSON) | 5 idx |
| observations | id TEXT | session_id FK, type, title, content, facts(JSON), concepts(JSON), discovery_tokens INT | 3 idx |
| observations_fts | FTS5 | title, content, facts, concepts | porter unicode61, 3 triggers (ai/ad/au) |
| permanent_memory | id TEXT | type, title, content(JSON), session_id | |
| permanent_memory_fts | FTS5 | title, content | porter unicode61, 3 triggers (ai/ad/au) |
| tool_usage | id INT AI | tool_name, session_id, result_quality, duration_ms | 1 idx |
| branches | name TEXT | data(JSON), archived INT, updated_at | |
| evolution_candidates | id TEXT | type, title, confidence REAL, model_scope, status, data(JSON) | 3 idx |
| evolution_log | id TEXT | candidate_id FK, action, title, confidence REAL | 1 idx |
| evolution_snapshots | id TEXT | candidate_id FK, before_state(JSON), applied_at | |
| drafts | id TEXT | category, title, content, status, data(JSON) | 2 idx |
| lifecycle_sessions | id TEXT | session_id, feature, current_phase, status, phases(JSON) | 1 idx |
| banned_patterns | id TEXT | category, pattern, type, severity, model_scope, origin, active INT, use_count INT | 3 idx |
| pattern_detections | id INT AI | session_id, model_id, pattern_id FK, matched_text, source | 4 idx |
| audit_scores | id INT AI | session_id, model_id, input_hash, scores(JSON), verdict | 2 idx |

## Pruning (pruneStaleData)
pattern_detections: >30d | observations: >1K cap | sessions_indexed: >50

## FTS Search
BM25 ranking, query tokens joined with OR, relevance=min(1, |rank|/10)
