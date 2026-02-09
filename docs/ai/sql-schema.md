# SQLite Schema (15 tables, 30 idx, 6 triggers)

PRAGMA: WAL, FK=ON, busy_timeout=5000 (no SQL REFERENCES constraints in current schema)

## Tables

| Table | PK | Key Columns | Notes |
|-------|-----|------------|-------|
| meta | key TEXT | value |  |
| sessions | id TEXT | memory_session_id, parent_session_id, branch, status, model_id, data(JSON) | 5 idx |
| observations | id TEXT | session_id, type, title, content, facts(JSON), concepts(JSON), files_read(JSON), files_modified(JSON), discovery_tokens | 3 idx, 3 triggers |
| permanent_memory | id TEXT | type, title, content, session_id | 3 triggers |
| tool_usage | id INT AI | tool_name, session_id, result_quality, duration_ms, timestamp | 1 idx |
| branches | name TEXT | data(JSON), archived |  |
| evolution_candidates | id TEXT | type, title, confidence, model_scope, status, data(JSON) | 3 idx |
| evolution_log | id TEXT | candidate_id, action, title, confidence, timestamp | 1 idx |
| evolution_snapshots | id TEXT | candidate_id, before_state(JSON) |  |
| drafts | id TEXT | category, title, content, status, data(JSON) | 2 idx |
| lifecycle_sessions | id TEXT | session_id, feature, current_phase, status, phases(JSON) | 1 idx |
| banned_patterns | id TEXT | category, pattern, type, severity, model_scope, origin, active, use_count, hint | 3 idx |
| pattern_detections | id INT AI | session_id, model_id, pattern_id, matched_text, context, source | 4 idx |
| artifacts | id TEXT | session_id, type, feature, status, title, description, content, date | 5 idx |
| audit_scores | id INT AI | session_id, model_id, input_hash, scores(JSON), verdict | 2 idx |
| observations_fts | FTS5 |  | porter unicode61 |
| permanent_memory_fts | FTS5 |  | porter unicode61 |

## Pruning (pruneStaleData)
pattern_detections: >30d | observations: >1K cap | sessions_indexed: >50

## FTS Search
BM25 ranking, query tokens joined with OR, relevance=min(1, |rank|/10)
