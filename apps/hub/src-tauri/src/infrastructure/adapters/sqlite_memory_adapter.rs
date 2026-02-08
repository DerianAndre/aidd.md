use rusqlite::{Connection, OpenFlags};
use std::path::PathBuf;
use std::sync::Arc;

use crate::domain::ports::inbound::{
    MemoryPort, ProjectPort, SessionSummary, SessionInfo, ObservationEntry, EvolutionStatus, PatternStats,
};
use crate::application::ProjectService;

/// Required tables for memory queries.
/// If any are missing, the database is considered invalid.
const REQUIRED_TABLES: &[&str] = &[
    "sessions",
    "observations",
    "evolution_candidates",
    "evolution_log",
    "banned_patterns",
    "pattern_detections",
    "permanent_memory",
];

/// SQLite Adapter for Memory Port.
/// Directly queries the project's memory database (read-only).
/// Dynamically resolves the active project's database path.
pub struct SqliteMemoryAdapter {
    project_service: Arc<ProjectService>,
}

impl SqliteMemoryAdapter {
    pub fn new(project_service: Arc<ProjectService>) -> Self {
        Self { project_service }
    }

    /// Get the database path for the active project
    fn get_db_path(&self) -> Result<PathBuf, String> {
        let active_path = self.project_service.get_active_path()
            .map_err(|e| format!("Failed to get active project: {}", e))?
            .ok_or_else(|| "No active project configured".to_string())?;

        let db_path = PathBuf::from(active_path)
            .join(".aidd")
            .join("data.db");

        // Verify file exists before opening (prevents creating empty DB)
        if !db_path.exists() {
            return Err(format!("Database not found: {}", db_path.display()));
        }

        Ok(db_path)
    }

    /// Open a read-only connection to the project database
    fn open_connection(&self) -> Result<Connection, String> {
        let path = self.get_db_path()?;

        Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_ONLY)
            .map_err(|e| format!("Failed to open database: {}", e))
    }

    /// Verify that required tables exist in the database
    fn verify_schema(&self, conn: &Connection) -> Result<(), String> {
        verify_schema(conn)
    }

    fn safe_query<T, F>(&self, f: F) -> Result<T, String>
    where
        F: Fn(&Connection) -> Result<T, rusqlite::Error>,
    {
        let conn = self.open_connection()?;
        self.verify_schema(&conn)?;
        f(&conn).map_err(|e| format!("Database query failed: {}", e))
    }
}

/// Verify that required tables exist in the database.
/// Extracted as standalone function for testability.
fn verify_schema(conn: &Connection) -> Result<(), String> {
    for table in REQUIRED_TABLES {
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name=?1)",
            [table],
            |row| row.get(0),
        ).unwrap_or(false);

        if !exists {
            return Err(format!("Missing required table: {}", table));
        }
    }
    Ok(())
}

impl MemoryPort for SqliteMemoryAdapter {
    fn get_session_summary(&self) -> Result<SessionSummary, String> {
        self.safe_query(|conn| {
            // Count total sessions
            let total: usize = conn.query_row(
                "SELECT COUNT(*) FROM sessions",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            // Count active sessions (no ended_at)
            let active: usize = conn.query_row(
                "SELECT COUNT(*) FROM sessions WHERE ended_at IS NULL",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            // Compute completed
            let completed = total.saturating_sub(active);

            // Get recent sessions
            let mut stmt = conn.prepare(
                "SELECT id, branch, started_at FROM sessions ORDER BY started_at DESC LIMIT 5"
            )?;

            let recent = stmt.query_map([], |row| {
                Ok(SessionInfo {
                    id: row.get(0)?,
                    branch: row.get(1)?,
                    started_at: row.get(2)?,
                    status: "completed".to_string(),
                })
            })?
                .filter_map(|r| r.ok())
                .collect();

            Ok(SessionSummary {
                total,
                active,
                completed,
                recent_sessions: recent,
            })
        }).or_else(|_| {
            // Return empty structure if DB unavailable
            Ok(SessionSummary {
                total: 0,
                active: 0,
                completed: 0,
                recent_sessions: vec![],
            })
        })
    }

    fn list_all_observations(&self, limit: Option<usize>) -> Result<Vec<serde_json::Value>, String> {
        let limit = limit.unwrap_or(200);
        self.safe_query(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, session_id, type, title, content, facts, concepts, \
                 files_read, files_modified, discovery_tokens, created_at \
                 FROM observations ORDER BY created_at DESC LIMIT ?1"
            )?;

            let observations = stmt.query_map([limit], |row| {
                let mut entry = serde_json::Map::new();
                entry.insert("id".into(), serde_json::json!(row.get::<_, String>(0)?));
                entry.insert("sessionId".into(), serde_json::json!(row.get::<_, String>(1)?));
                entry.insert("type".into(), serde_json::json!(row.get::<_, String>(2)?));
                entry.insert("title".into(), serde_json::json!(row.get::<_, String>(3)?));
                entry.insert("narrative".into(), serde_json::json!(row.get::<_, Option<String>>(4)?.unwrap_or_default()));

                // Parse JSON array fields
                let facts_str: String = row.get::<_, Option<String>>(5)?.unwrap_or_default();
                let concepts_str: String = row.get::<_, Option<String>>(6)?.unwrap_or_default();
                let files_read_str: String = row.get::<_, Option<String>>(7)?.unwrap_or_default();
                let files_modified_str: String = row.get::<_, Option<String>>(8)?.unwrap_or_default();

                entry.insert("facts".into(), serde_json::from_str(&facts_str).unwrap_or(serde_json::json!([])));
                entry.insert("concepts".into(), serde_json::from_str(&concepts_str).unwrap_or(serde_json::json!([])));
                entry.insert("filesRead".into(), serde_json::from_str(&files_read_str).unwrap_or(serde_json::json!([])));
                entry.insert("filesModified".into(), serde_json::from_str(&files_modified_str).unwrap_or(serde_json::json!([])));
                entry.insert("discoveryTokens".into(), serde_json::json!(row.get::<_, Option<i64>>(9)?.unwrap_or(0)));
                entry.insert("createdAt".into(), serde_json::json!(row.get::<_, String>(10)?));

                Ok(serde_json::Value::Object(entry))
            })?
                .filter_map(|r| r.ok())
                .collect();

            Ok(observations)
        }).or_else(|_| Ok(vec![]))
    }

    fn search_observations(
        &self,
        query: &str,
        limit: Option<usize>,
    ) -> Result<Vec<ObservationEntry>, String> {
        let limit = limit.unwrap_or(10);

        self.safe_query(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, session_id, title, type, created_at FROM observations \
                 WHERE title LIKE ?1 OR type LIKE ?1 \
                 ORDER BY created_at DESC LIMIT ?2"
            )?;

            let search_term = format!("%{}%", query);
            let observations = stmt.query_map([&search_term, &limit.to_string()], |row| {
                Ok(ObservationEntry {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    title: row.get(2)?,
                    observation_type: row.get::<_, String>(3)?,
                    created_at: row.get(4)?,
                })
            })?
                .filter_map(|r| r.ok())
                .collect();

            Ok(observations)
        }).or_else(|_| Ok(vec![]))
    }

    fn get_evolution_status(&self) -> Result<EvolutionStatus, String> {
        self.safe_query(|conn| {
            let pending: usize = conn.query_row(
                "SELECT COUNT(*) FROM evolution_candidates WHERE status = 'pending'",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            let approved: usize = conn.query_row(
                "SELECT COUNT(*) FROM evolution_candidates WHERE status = 'approved'",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            let rejected: usize = conn.query_row(
                "SELECT COUNT(*) FROM evolution_candidates WHERE status = 'rejected'",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            let auto_applied: usize = conn.query_row(
                "SELECT COUNT(*) FROM evolution_log WHERE action = 'auto_applied'",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            Ok(EvolutionStatus {
                pending_count: pending,
                approved_count: approved,
                rejected_count: rejected,
                auto_applied_count: auto_applied,
            })
        }).or_else(|_| {
            Ok(EvolutionStatus {
                pending_count: 0,
                approved_count: 0,
                rejected_count: 0,
                auto_applied_count: 0,
            })
        })
    }

    fn get_pattern_stats(&self) -> Result<PatternStats, String> {
        self.safe_query(|conn| {
            let total: usize = conn.query_row(
                "SELECT COUNT(*) FROM banned_patterns",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            let active: usize = conn.query_row(
                "SELECT COUNT(*) FROM banned_patterns WHERE active = 1",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            let detections: usize = conn.query_row(
                "SELECT COUNT(*) FROM pattern_detections",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            let false_positives: usize = conn.query_row(
                "SELECT COUNT(*) FROM pattern_detections WHERE source = 'false_positive'",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            Ok(PatternStats {
                total_patterns: total,
                active_patterns: active,
                total_detections: detections,
                false_positives,
            })
        }).or_else(|_| {
            Ok(PatternStats {
                total_patterns: 0,
                active_patterns: 0,
                total_detections: 0,
                false_positives: 0,
            })
        })
    }

    fn list_all_sessions(&self, limit: Option<usize>) -> Result<Vec<serde_json::Value>, String> {
        let limit = limit.unwrap_or(100);
        self.safe_query(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT data FROM sessions ORDER BY started_at DESC LIMIT ?1"
            )?;

            let sessions = stmt.query_map([limit], |row| {
                let data: String = row.get(0)?;
                Ok(serde_json::from_str::<serde_json::Value>(&data).unwrap_or(serde_json::Value::Null))
            })?
                .filter_map(|r| r.ok())
                .filter(|v| !v.is_null())
                .collect();

            Ok(sessions)
        }).or_else(|_| Ok(vec![]))
    }

    fn list_evolution_candidates(&self) -> Result<Vec<serde_json::Value>, String> {
        self.safe_query(|conn| {
            let mut stmt = conn.prepare(
                "SELECT data FROM evolution_candidates ORDER BY confidence DESC"
            )?;

            let candidates = stmt.query_map([], |row| {
                let data: String = row.get(0)?;
                Ok(serde_json::from_str::<serde_json::Value>(&data).unwrap_or(serde_json::Value::Null))
            })?
                .filter_map(|r| r.ok())
                .filter(|v| !v.is_null())
                .collect();

            Ok(candidates)
        }).or_else(|_| Ok(vec![]))
    }

    fn list_evolution_log(&self, limit: Option<usize>) -> Result<Vec<serde_json::Value>, String> {
        let limit = limit.unwrap_or(50);
        self.safe_query(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, candidate_id, action, title, confidence, timestamp \
                 FROM evolution_log ORDER BY timestamp DESC LIMIT ?1"
            )?;

            let entries = stmt.query_map([limit], |row| {
                Ok(serde_json::json!({
                    "id": row.get::<_, String>(0)?,
                    "candidateId": row.get::<_, String>(1)?,
                    "action": row.get::<_, String>(2)?,
                    "title": row.get::<_, String>(3)?,
                    "confidence": row.get::<_, f64>(4)?,
                    "timestamp": row.get::<_, String>(5)?
                }))
            })?
                .filter_map(|r| r.ok())
                .collect();

            Ok(entries)
        }).or_else(|_| Ok(vec![]))
    }

    fn list_permanent_memory(&self, memory_type: &str) -> Result<Vec<serde_json::Value>, String> {
        let memory_type = memory_type.to_string();
        self.safe_query(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, type, title, content, created_at, session_id \
                 FROM permanent_memory WHERE type = ?1 ORDER BY created_at DESC"
            )?;

            let entries = stmt.query_map([&memory_type], |row| {
                let id: String = row.get(0)?;
                let entry_type: String = row.get(1)?;
                let title: String = row.get(2)?;
                let content: String = row.get(3)?;
                let created_at: String = row.get(4)?;
                let session_id: Option<String> = row.get(5)?;

                // Parse content JSON and merge with metadata
                let content_value = serde_json::from_str::<serde_json::Value>(&content)
                    .unwrap_or(serde_json::json!({}));

                let mut entry = serde_json::Map::new();
                entry.insert("id".into(), serde_json::json!(id));
                entry.insert("type".into(), serde_json::json!(entry_type));
                entry.insert("createdAt".into(), serde_json::json!(created_at));
                if let Some(sid) = session_id {
                    entry.insert("sessionId".into(), serde_json::json!(sid));
                }

                // Type-specific field mapping
                match memory_type.as_str() {
                    "mistake" => {
                        entry.insert("error".into(), serde_json::json!(title));
                        if let serde_json::Value::Object(map) = content_value {
                            for (k, v) in map {
                                entry.insert(k, v);
                            }
                        }
                    }
                    "decision" => {
                        entry.insert("decision".into(), serde_json::json!(title));
                        if let serde_json::Value::Object(map) = content_value {
                            for (k, v) in map {
                                entry.insert(k, v);
                            }
                        }
                    }
                    "convention" => {
                        entry.insert("convention".into(), serde_json::json!(title));
                        if let serde_json::Value::Object(map) = content_value {
                            for (k, v) in map {
                                entry.insert(k, v);
                            }
                        }
                    }
                    _ => {
                        entry.insert("title".into(), serde_json::json!(title));
                        entry.insert("content".into(), content_value);
                    }
                }

                Ok(serde_json::Value::Object(entry))
            })?
                .filter_map(|r| r.ok())
                .collect();

            Ok(entries)
        }).or_else(|_| Ok(vec![]))
    }

    fn delete_permanent_memory(&self, _memory_type: &str, id: &str) -> Result<(), String> {
        let id = id.to_string();
        self.safe_query(move |conn| {
            conn.execute(
                "DELETE FROM permanent_memory WHERE id = ?1",
                [&id],
            )?;
            // Also clean FTS index
            conn.execute(
                "DELETE FROM permanent_memory_fts WHERE rowid NOT IN (SELECT rowid FROM permanent_memory)",
                [],
            ).ok(); // Ignore FTS errors
            Ok(())
        }).map(|_| ())
    }

    fn list_drafts(&self) -> Result<Vec<serde_json::Value>, String> {
        self.safe_query(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, category, title, content, status, data, created_at, updated_at \
                 FROM drafts ORDER BY created_at DESC"
            )?;

            let drafts = stmt.query_map([], |row| {
                let mut entry = serde_json::Map::new();
                entry.insert("id".into(), serde_json::json!(row.get::<_, String>(0)?));
                entry.insert("category".into(), serde_json::json!(row.get::<_, String>(1)?));
                entry.insert("title".into(), serde_json::json!(row.get::<_, String>(2)?));
                entry.insert("content".into(), serde_json::json!(row.get::<_, String>(3)?));
                entry.insert("status".into(), serde_json::json!(row.get::<_, String>(4)?));

                // Parse the data JSON column for extra fields (filename, confidence, source, etc.)
                let data_str: String = row.get::<_, String>(5).unwrap_or_default();
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(&data_str) {
                    if let Some(obj) = data.as_object() {
                        for (k, v) in obj {
                            // Merge data fields into the entry (camelCase keys)
                            entry.entry(k.clone()).or_insert_with(|| v.clone());
                        }
                    }
                }

                entry.insert("createdAt".into(), serde_json::json!(row.get::<_, String>(6)?));
                entry.insert("updatedAt".into(), serde_json::json!(row.get::<_, String>(7).unwrap_or_default()));
                Ok(serde_json::Value::Object(entry))
            })?
                .filter_map(|r| r.ok())
                .collect();

            Ok(drafts)
        }).or_else(|_| Ok(vec![]))
    }

    fn list_artifacts(
        &self,
        artifact_type: Option<&str>,
        status: Option<&str>,
        limit: Option<usize>,
    ) -> Result<Vec<serde_json::Value>, String> {
        let artifact_type = artifact_type.map(|s| s.to_string());
        let status = status.map(|s| s.to_string());
        let limit = limit.unwrap_or(100);

        self.safe_query(move |conn| {
            let mut sql = String::from(
                "SELECT id, session_id, type, feature, status, title, description, content, date, created_at, updated_at FROM artifacts"
            );
            let mut conditions: Vec<String> = vec![];
            let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![];

            if let Some(ref t) = artifact_type {
                conditions.push(format!("type = ?{}", params.len() + 1));
                params.push(Box::new(t.clone()));
            }
            if let Some(ref s) = status {
                conditions.push(format!("status = ?{}", params.len() + 1));
                params.push(Box::new(s.clone()));
            }

            if !conditions.is_empty() {
                sql.push_str(" WHERE ");
                sql.push_str(&conditions.join(" AND "));
            }

            sql.push_str(&format!(" ORDER BY date DESC, created_at DESC LIMIT ?{}", params.len() + 1));
            params.push(Box::new(limit));

            let mut stmt = conn.prepare(&sql)?;
            let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

            let artifacts = stmt.query_map(param_refs.as_slice(), |row| {
                let mut entry = serde_json::Map::new();
                entry.insert("id".into(), serde_json::json!(row.get::<_, String>(0)?));
                let session_id: Option<String> = row.get(1)?;
                if let Some(sid) = session_id {
                    entry.insert("sessionId".into(), serde_json::json!(sid));
                }
                entry.insert("type".into(), serde_json::json!(row.get::<_, String>(2)?));
                entry.insert("feature".into(), serde_json::json!(row.get::<_, String>(3)?));
                entry.insert("status".into(), serde_json::json!(row.get::<_, String>(4)?));
                entry.insert("title".into(), serde_json::json!(row.get::<_, String>(5)?));
                entry.insert("description".into(), serde_json::json!(row.get::<_, String>(6)?));
                entry.insert("content".into(), serde_json::json!(row.get::<_, String>(7)?));
                entry.insert("date".into(), serde_json::json!(row.get::<_, String>(8)?));
                entry.insert("createdAt".into(), serde_json::json!(row.get::<_, String>(9)?));
                entry.insert("updatedAt".into(), serde_json::json!(row.get::<_, String>(10)?));
                Ok(serde_json::Value::Object(entry))
            })?
                .filter_map(|r| r.ok())
                .collect();

            Ok(artifacts)
        }).or_else(|_| Ok(vec![]))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    /// Create an in-memory database matching the real AIDD schema from migrations.ts
    fn create_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE sessions (
                id TEXT PRIMARY KEY,
                memory_session_id TEXT,
                parent_session_id TEXT,
                branch TEXT NOT NULL DEFAULT '',
                started_at TEXT NOT NULL DEFAULT '',
                ended_at TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                model_id TEXT,
                data TEXT NOT NULL DEFAULT '{}'
            );
            CREATE TABLE observations (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT '',
                title TEXT NOT NULL DEFAULT '',
                content TEXT,
                facts TEXT,
                concepts TEXT,
                files_read TEXT,
                files_modified TEXT,
                discovery_tokens INTEGER,
                created_at TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE evolution_candidates (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL DEFAULT '',
                title TEXT NOT NULL DEFAULT '',
                confidence REAL NOT NULL DEFAULT 0,
                model_scope TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                data TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE evolution_log (
                id TEXT PRIMARY KEY,
                candidate_id TEXT NOT NULL,
                action TEXT NOT NULL DEFAULT '',
                title TEXT NOT NULL DEFAULT '',
                confidence REAL NOT NULL DEFAULT 0,
                timestamp TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE banned_patterns (
                id TEXT PRIMARY KEY,
                category TEXT NOT NULL DEFAULT '',
                pattern TEXT NOT NULL DEFAULT '',
                type TEXT NOT NULL DEFAULT 'regex',
                severity TEXT NOT NULL DEFAULT 'medium',
                model_scope TEXT,
                origin TEXT NOT NULL DEFAULT 'system',
                active INTEGER NOT NULL DEFAULT 1,
                use_count INTEGER NOT NULL DEFAULT 0,
                hint TEXT,
                created_at TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE pattern_detections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                model_id TEXT NOT NULL DEFAULT '',
                pattern_id TEXT,
                matched_text TEXT NOT NULL DEFAULT '',
                context TEXT,
                source TEXT NOT NULL DEFAULT 'auto',
                created_at TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE permanent_memory (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL DEFAULT '',
                title TEXT NOT NULL DEFAULT '',
                content TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT '',
                session_id TEXT
            );"
        ).unwrap();
        conn
    }

    #[test]
    fn verify_schema_passes_with_all_tables() {
        let conn = create_test_db();
        let result = verify_schema(&conn);
        assert!(result.is_ok(), "Schema verification should pass: {:?}", result);
    }

    #[test]
    fn verify_schema_fails_with_missing_table() {
        let conn = Connection::open_in_memory().unwrap();
        // Create only some tables
        conn.execute_batch(
            "CREATE TABLE sessions (id TEXT PRIMARY KEY);
             CREATE TABLE observations (id TEXT PRIMARY KEY);"
        ).unwrap();

        let result = verify_schema(&conn);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Missing required table"));
    }

    #[test]
    fn verify_schema_fails_on_empty_database() {
        let conn = Connection::open_in_memory().unwrap();
        let result = verify_schema(&conn);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Missing required table: sessions"));
    }

    #[test]
    fn session_query_returns_correct_counts() {
        let conn = create_test_db();

        // Insert test sessions (using real schema with data column)
        conn.execute(
            "INSERT INTO sessions (id, branch, started_at, ended_at, status, data) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            ["s1", "main", "2026-01-01T00:00:00Z", "2026-01-01T01:00:00Z", "completed", r#"{"id":"s1","branch":"main","startedAt":"2026-01-01T00:00:00Z"}"#],
        ).unwrap();
        conn.execute(
            "INSERT INTO sessions (id, branch, started_at, status, data) VALUES (?1, ?2, ?3, ?4, ?5)",
            ["s2", "feat/test", "2026-01-02T00:00:00Z", "active", r#"{"id":"s2","branch":"feat/test","startedAt":"2026-01-02T00:00:00Z"}"#],
        ).unwrap();

        let total: usize = conn.query_row(
            "SELECT COUNT(*) FROM sessions", [], |row| row.get(0),
        ).unwrap();
        let active: usize = conn.query_row(
            "SELECT COUNT(*) FROM sessions WHERE ended_at IS NULL", [], |row| row.get(0),
        ).unwrap();

        assert_eq!(total, 2);
        assert_eq!(active, 1);
    }

    #[test]
    fn evolution_query_returns_correct_status_counts() {
        let conn = create_test_db();

        conn.execute(
            "INSERT INTO evolution_candidates (id, type, title, status, data, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            ["e1", "rule_elevation", "Test 1", "pending", "{}", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"],
        ).unwrap();
        conn.execute(
            "INSERT INTO evolution_candidates (id, type, title, status, data, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            ["e2", "skill_combo", "Test 2", "pending", "{}", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"],
        ).unwrap();
        conn.execute(
            "INSERT INTO evolution_candidates (id, type, title, status, data, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            ["e3", "new_convention", "Test 3", "approved", "{}", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"],
        ).unwrap();

        let pending: usize = conn.query_row(
            "SELECT COUNT(*) FROM evolution_candidates WHERE status = 'pending'",
            [], |row| row.get(0),
        ).unwrap();
        let approved: usize = conn.query_row(
            "SELECT COUNT(*) FROM evolution_candidates WHERE status = 'approved'",
            [], |row| row.get(0),
        ).unwrap();

        assert_eq!(pending, 2);
        assert_eq!(approved, 1);
    }

    #[test]
    fn pattern_query_returns_correct_stats() {
        let conn = create_test_db();

        conn.execute(
            "INSERT INTO banned_patterns (id, active) VALUES (?1, ?2)",
            ["p1", "1"],
        ).unwrap();
        conn.execute(
            "INSERT INTO banned_patterns (id, active) VALUES (?1, ?2)",
            ["p2", "0"],
        ).unwrap();

        let total: usize = conn.query_row(
            "SELECT COUNT(*) FROM banned_patterns", [], |row| row.get(0),
        ).unwrap();
        let active: usize = conn.query_row(
            "SELECT COUNT(*) FROM banned_patterns WHERE active = 1", [], |row| row.get(0),
        ).unwrap();

        assert_eq!(total, 2);
        assert_eq!(active, 1);
    }

    #[test]
    fn observation_search_matches_title() {
        let conn = create_test_db();

        conn.execute(
            "INSERT INTO observations (id, session_id, title, type, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            ["o1", "s1", "Fix authentication bug", "mistake", "2026-01-01T00:00:00Z"],
        ).unwrap();
        conn.execute(
            "INSERT INTO observations (id, session_id, title, type, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            ["o2", "s1", "Add caching layer", "decision", "2026-01-02T00:00:00Z"],
        ).unwrap();

        let search_term = "%auth%";
        let mut stmt = conn.prepare(
            "SELECT id FROM observations WHERE title LIKE ?1 ORDER BY created_at DESC LIMIT 10"
        ).unwrap();

        let results: Vec<String> = stmt.query_map([search_term], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0], "o1");
    }
}
