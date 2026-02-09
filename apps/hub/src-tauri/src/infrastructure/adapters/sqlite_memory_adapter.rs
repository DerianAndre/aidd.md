use rusqlite::{Connection, OpenFlags, OptionalExtension};
use std::path::PathBuf;
use std::sync::Arc;
use uuid::Uuid;

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
/// Queries and writes to the project's memory database.
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

    /// Open a read-write connection (never creates DB — no SQLITE_OPEN_CREATE)
    fn open_rw_connection(&self) -> Result<Connection, String> {
        let path = self.get_db_path()?;

        Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_WRITE)
            .map_err(|e| format!("Failed to open database for writing: {}", e))
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

    fn safe_write<T, F>(&self, f: F) -> Result<T, String>
    where
        F: Fn(&Connection) -> Result<T, rusqlite::Error>,
    {
        let conn = self.open_rw_connection()?;
        self.verify_schema(&conn)?;
        f(&conn).map_err(|e| format!("Database write failed: {}", e))
    }

    /// Generate an ISO 8601 timestamp for the current time
    fn now_iso() -> String {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default();
        let secs = now.as_secs();
        // Simple UTC ISO format — matches JS new Date().toISOString()
        let days_since_epoch = secs / 86400;
        let time_of_day = secs % 86400;
        let hours = time_of_day / 3600;
        let minutes = (time_of_day % 3600) / 60;
        let seconds = time_of_day % 60;

        // Compute year/month/day from days since epoch (1970-01-01)
        let (year, month, day) = days_to_ymd(days_since_epoch);

        format!(
            "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.000Z",
            year, month, day, hours, minutes, seconds
        )
    }

    /// Generate current Unix timestamp in milliseconds.
    fn now_unix_ms() -> i64 {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default();
        now.as_millis() as i64
    }
}

/// Convert days since Unix epoch to (year, month, day)
fn days_to_ymd(days: u64) -> (u64, u64, u64) {
    // Algorithm from http://howardhinnant.github.io/date_algorithms.html
    let z = days + 719468;
    let era = z / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

fn normalize_artifact_type(raw: &str) -> Option<String> {
    let normalized = raw.trim().to_lowercase();
    match normalized.as_str() {
        "plan" | "brainstorm" | "research" | "adr" | "diagram" | "issue" | "spec" | "checklist" | "retro" => {
            Some(normalized)
        }
        _ => None,
    }
}

fn parse_auto_draft_title(title: &str) -> (Option<String>, Option<String>) {
    let trimmed = title.trim();
    if !trimmed.to_ascii_lowercase().starts_with("auto draft:") {
        return (None, None);
    }
    let rest = trimmed
        .split_once(':')
        .map(|(_, tail)| tail.trim())
        .unwrap_or_default();
    let marker = " for session ";
    let rest_lc = rest.to_ascii_lowercase();
    if let Some(pos) = rest_lc.find(marker) {
        let artifact_raw = rest[..pos].trim();
        let session_raw = rest[pos + marker.len()..].trim();
        let artifact_type = normalize_artifact_type(artifact_raw);
        let session_id = if session_raw.is_empty() {
            None
        } else {
            Some(session_raw.to_string())
        };
        return (session_id, artifact_type);
    }
    (None, None)
}

fn parse_auto_draft_content(content: &str) -> (Option<String>, Option<String>) {
    let mut session_id: Option<String> = None;
    let mut artifact_type: Option<String> = None;
    for raw_line in content.lines() {
        let line = raw_line.trim();
        if line.is_empty() {
            continue;
        }
        let line_lc = line.to_ascii_lowercase();
        if session_id.is_none() && line_lc.starts_with("- sessionid:") {
            let value = line.split_once(':').map(|(_, v)| v.trim()).unwrap_or_default();
            if !value.is_empty() {
                session_id = Some(value.to_string());
            }
            continue;
        }
        if artifact_type.is_none() && line_lc.starts_with("- artifacttype:") {
            let value = line.split_once(':').map(|(_, v)| v.trim()).unwrap_or_default();
            artifact_type = normalize_artifact_type(value);
        }
    }
    (session_id, artifact_type)
}

fn extract_auto_draft_binding(
    title: &str,
    content: &str,
    data: &serde_json::Value,
) -> (Option<String>, Option<String>) {
    let mut session_id = data
        .get("sessionId")
        .and_then(|v| v.as_str())
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty());
    let mut artifact_type = data
        .get("artifactType")
        .and_then(|v| v.as_str())
        .and_then(normalize_artifact_type);

    if session_id.is_some() && artifact_type.is_some() {
        return (session_id, artifact_type);
    }

    let (title_session, title_type) = parse_auto_draft_title(title);
    if session_id.is_none() {
        session_id = title_session;
    }
    if artifact_type.is_none() {
        artifact_type = title_type;
    }

    if session_id.is_some() && artifact_type.is_some() {
        return (session_id, artifact_type);
    }

    let (content_session, content_type) = parse_auto_draft_content(content);
    if session_id.is_none() {
        session_id = content_session;
    }
    if artifact_type.is_none() {
        artifact_type = content_type;
    }

    (session_id, artifact_type)
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
                let started_at_val = row.get_ref(2)?;
                let started_at = match started_at_val {
                    rusqlite::types::ValueRef::Integer(v) => v.to_string(),
                    rusqlite::types::ValueRef::Text(v) => String::from_utf8_lossy(v).to_string(),
                    _ => String::new(),
                };
                Ok(SessionInfo {
                    id: row.get(0)?,
                    branch: row.get(1)?,
                    started_at,
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

    fn list_observations_by_session(
        &self,
        session_id: &str,
        limit: Option<usize>,
    ) -> Result<Vec<serde_json::Value>, String> {
        let session_id = session_id.to_string();
        let limit = limit.unwrap_or(500);
        self.safe_query(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, session_id, type, title, content, facts, concepts, \
                 files_read, files_modified, discovery_tokens, created_at \
                 FROM observations \
                 WHERE session_id = ?1 \
                 ORDER BY created_at DESC \
                 LIMIT ?2"
            )?;

            let observations = stmt.query_map(rusqlite::params![session_id, limit], |row| {
                let mut entry = serde_json::Map::new();
                entry.insert("id".into(), serde_json::json!(row.get::<_, String>(0)?));
                entry.insert("sessionId".into(), serde_json::json!(row.get::<_, String>(1)?));
                entry.insert("type".into(), serde_json::json!(row.get::<_, String>(2)?));
                entry.insert("title".into(), serde_json::json!(row.get::<_, String>(3)?));
                entry.insert("narrative".into(), serde_json::json!(row.get::<_, Option<String>>(4)?.unwrap_or_default()));

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
                "SELECT data,
                        CASE
                          WHEN typeof(started_at) = 'integer' THEN CAST(started_at AS INTEGER)
                          WHEN started_at IS NULL OR started_at = '' THEN CAST(strftime('%s', 'now') AS INTEGER) * 1000
                          WHEN started_at GLOB '[0-9]*' THEN CAST(started_at AS INTEGER)
                          ELSE CAST(strftime('%s', started_at) AS INTEGER) * 1000
                        END AS started_at_ts,
                        CASE
                          WHEN ended_at IS NULL OR ended_at = '' THEN NULL
                          WHEN typeof(ended_at) = 'integer' THEN CAST(ended_at AS INTEGER)
                          WHEN ended_at GLOB '[0-9]*' THEN CAST(ended_at AS INTEGER)
                          ELSE CAST(strftime('%s', ended_at) AS INTEGER) * 1000
                        END AS ended_at_ts
                 FROM sessions
                 ORDER BY started_at_ts DESC
                 LIMIT ?1"
            )?;

            let sessions = stmt.query_map([limit], |row| {
                let data: String = row.get(0)?;
                let started_at_ts: i64 = row.get(1)?;
                let ended_at_ts: Option<i64> = row.get(2)?;

                let mut parsed = serde_json::from_str::<serde_json::Value>(&data)
                    .unwrap_or(serde_json::Value::Null);
                if let Some(obj) = parsed.as_object_mut() {
                    obj.insert("startedAtTs".into(), serde_json::json!(started_at_ts));
                    if let Some(v) = ended_at_ts {
                        obj.insert("endedAtTs".into(), serde_json::json!(v));
                    }
                }

                Ok(parsed)
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
                "SELECT json_set(data, '$.status', status) FROM evolution_candidates \
                 WHERE status = 'pending' OR status IS NULL ORDER BY confidence DESC"
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
        self.safe_write(move |conn| {
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
        })
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
                "SELECT id, session_id, type, feature, status, title, description, content,
                        CASE
                          WHEN typeof(date) = 'integer' THEN CAST(date AS INTEGER)
                          WHEN date IS NULL OR date = '' THEN CAST(strftime('%s', 'now') AS INTEGER) * 1000
                          WHEN date GLOB '[0-9]*' THEN CAST(date AS INTEGER)
                          WHEN instr(date, '.') > 0 THEN CAST(strftime('%s', replace(date, '.', '-') || ' 00:00:00') AS INTEGER) * 1000
                          ELSE CAST(strftime('%s', date) AS INTEGER) * 1000
                        END AS date_ts,
                        CASE
                          WHEN typeof(created_at) = 'integer' THEN CAST(created_at AS INTEGER)
                          WHEN created_at IS NULL OR created_at = '' THEN CAST(strftime('%s', 'now') AS INTEGER) * 1000
                          WHEN created_at GLOB '[0-9]*' THEN CAST(created_at AS INTEGER)
                          ELSE CAST(strftime('%s', created_at) AS INTEGER) * 1000
                        END AS created_at_ts,
                        CASE
                          WHEN typeof(updated_at) = 'integer' THEN CAST(updated_at AS INTEGER)
                          WHEN updated_at IS NULL OR updated_at = '' THEN CAST(strftime('%s', 'now') AS INTEGER) * 1000
                          WHEN updated_at GLOB '[0-9]*' THEN CAST(updated_at AS INTEGER)
                          ELSE CAST(strftime('%s', updated_at) AS INTEGER) * 1000
                        END AS updated_at_ts
                 FROM artifacts"
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

            sql.push_str(&format!(" ORDER BY date_ts DESC, created_at_ts DESC LIMIT ?{}", params.len() + 1));
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
                entry.insert("date".into(), serde_json::json!(row.get::<_, i64>(8)?));
                entry.insert("createdAt".into(), serde_json::json!(row.get::<_, i64>(9)?));
                entry.insert("updatedAt".into(), serde_json::json!(row.get::<_, i64>(10)?));
                Ok(serde_json::Value::Object(entry))
            })?
                .filter_map(|r| r.ok())
                .collect();

            Ok(artifacts)
        }).or_else(|_| Ok(vec![]))
    }

    fn list_audit_scores(&self, limit: Option<usize>) -> Result<Vec<serde_json::Value>, String> {
        let limit = limit.unwrap_or(200);

        self.safe_query(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, session_id, model_id, input_hash, scores, verdict, created_at \
                 FROM audit_scores ORDER BY created_at DESC LIMIT ?1"
            )?;

            let scores = stmt.query_map([limit], |row| {
                let mut entry = serde_json::Map::new();
                entry.insert("id".into(), serde_json::json!(row.get::<_, i64>(0)?));
                let session_id: Option<String> = row.get(1)?;
                if let Some(sid) = session_id {
                    entry.insert("sessionId".into(), serde_json::json!(sid));
                }
                entry.insert("modelId".into(), serde_json::json!(row.get::<_, String>(2)?));
                entry.insert("inputHash".into(), serde_json::json!(row.get::<_, String>(3)?));

                let scores_json: String = row.get(4)?;
                let parsed_scores = serde_json::from_str::<serde_json::Value>(&scores_json)
                    .unwrap_or_else(|_| serde_json::json!({}));
                if let Some(total) = parsed_scores.get("totalScore") {
                    entry.insert("totalScore".into(), total.clone());
                }
                if let Some(patterns_found) = parsed_scores.get("patternsFound") {
                    entry.insert("patternsFound".into(), patterns_found.clone());
                }
                if let Some(dimensions) = parsed_scores.get("dimensions") {
                    entry.insert("dimensions".into(), dimensions.clone());
                }

                entry.insert("verdict".into(), serde_json::json!(row.get::<_, String>(5)?));
                entry.insert("createdAt".into(), serde_json::json!(row.get::<_, String>(6)?));
                Ok(serde_json::Value::Object(entry))
            })?
                .filter_map(|r| r.ok())
                .collect();

            Ok(scores)
        }).or_else(|_| Ok(vec![]))
    }

    // --- Write operations ---

    fn create_permanent_memory(&self, memory_type: &str, title: &str, content: &str) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();
        let memory_type = memory_type.to_string();
        let title = title.to_string();
        let content = content.to_string();
        let now = Self::now_iso();
        let id_clone = id.clone();
        self.safe_write(move |conn| {
            conn.execute(
                "INSERT INTO permanent_memory (id, type, title, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![id_clone, memory_type, title, content, now],
            )?;
            Ok(id_clone.clone())
        })
    }

    fn update_permanent_memory(&self, id: &str, title: &str, content: &str) -> Result<(), String> {
        let id = id.to_string();
        let title = title.to_string();
        let content = content.to_string();
        self.safe_write(move |conn| {
            conn.execute(
                "UPDATE permanent_memory SET title = ?1, content = ?2 WHERE id = ?3",
                rusqlite::params![title, content, id],
            )?;
            Ok(())
        })
    }

    fn create_artifact(&self, artifact_type: &str, feature: &str, title: &str, description: &str, content: &str) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();
        let artifact_type = artifact_type.to_string();
        let feature = feature.to_string();
        let title = title.to_string();
        let description = description.to_string();
        let content = content.to_string();
        let now = Self::now_unix_ms();
        let id_clone = id.clone();
        self.safe_write(move |conn| {
            conn.execute(
                "INSERT INTO artifacts (id, type, feature, status, title, description, content, date, created_at, updated_at) \
                 VALUES (?1, ?2, ?3, 'active', ?4, ?5, ?6, ?7, ?8, ?8)",
                rusqlite::params![id_clone, artifact_type, feature, title, description, content, now, now],
            )?;
            Ok(id_clone.clone())
        })
    }

    fn update_artifact(&self, id: &str, artifact_type: &str, feature: &str, title: &str, description: &str, content: &str, status: &str) -> Result<(), String> {
        let id = id.to_string();
        let artifact_type = artifact_type.to_string();
        let feature = feature.to_string();
        let title = title.to_string();
        let description = description.to_string();
        let content = content.to_string();
        let status = status.to_string();
        let now = Self::now_unix_ms();
        self.safe_write(move |conn| {
            conn.execute(
                "UPDATE artifacts SET type = ?1, feature = ?2, title = ?3, description = ?4, content = ?5, status = ?6, updated_at = ?7 WHERE id = ?8",
                rusqlite::params![artifact_type, feature, title, description, content, status, now, id],
            )?;
            Ok(())
        })
    }

    fn archive_artifact(&self, id: &str) -> Result<(), String> {
        let id = id.to_string();
        let now = Self::now_unix_ms();
        self.safe_write(move |conn| {
            conn.execute(
                "UPDATE artifacts SET status = 'done', updated_at = ?1 WHERE id = ?2",
                rusqlite::params![now, id],
            )?;
            Ok(())
        })
    }

    fn delete_artifact(&self, id: &str) -> Result<(), String> {
        let id = id.to_string();
        self.safe_write(move |conn| {
            conn.execute("DELETE FROM artifacts WHERE id = ?1", rusqlite::params![id])?;
            Ok(())
        })
    }

    fn approve_evolution_candidate(&self, id: &str) -> Result<(), String> {
        let id = id.to_string();
        let now = Self::now_iso();
        let log_id = Uuid::new_v4().to_string();
        self.safe_write(move |conn| {
            // Get candidate title and confidence for the log entry
            let (title, confidence): (String, f64) = conn.query_row(
                "SELECT title, confidence FROM evolution_candidates WHERE id = ?1",
                [&id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )?;
            conn.execute(
                "UPDATE evolution_candidates SET status = 'approved', updated_at = ?1 WHERE id = ?2",
                rusqlite::params![now, id],
            )?;
            conn.execute(
                "INSERT INTO evolution_log (id, candidate_id, action, title, confidence, timestamp) \
                 VALUES (?1, ?2, 'approved', ?3, ?4, ?5)",
                rusqlite::params![log_id, id, title, confidence, now],
            )?;
            Ok(())
        })
    }

    fn reject_evolution_candidate(&self, id: &str, reason: &str) -> Result<(), String> {
        let id = id.to_string();
        let reason = reason.to_string();
        let now = Self::now_iso();
        let log_id = Uuid::new_v4().to_string();
        self.safe_write(move |conn| {
            let (title, confidence): (String, f64) = conn.query_row(
                "SELECT title, confidence FROM evolution_candidates WHERE id = ?1",
                [&id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )?;
            // Store rejection reason in data JSON
            conn.execute(
                "UPDATE evolution_candidates SET status = 'rejected', \
                 data = json_set(data, '$.rejectionReason', ?1), updated_at = ?2 WHERE id = ?3",
                rusqlite::params![reason, now, id],
            )?;
            conn.execute(
                "INSERT INTO evolution_log (id, candidate_id, action, title, confidence, timestamp) \
                 VALUES (?1, ?2, 'rejected', ?3, ?4, ?5)",
                rusqlite::params![log_id, id, title, confidence, now],
            )?;
            Ok(())
        })
    }

    fn approve_draft(&self, id: &str) -> Result<(), String> {
        let id = id.to_string();
        let now = Self::now_iso();
        let now_ms = Self::now_unix_ms();
        self.safe_write(move |conn| {
            let (category, title, content, status, data_str): (String, String, String, String, String) = conn.query_row(
                "SELECT category, title, content, status, data FROM drafts WHERE id = ?1",
                rusqlite::params![id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
            )?;

            if status != "pending" {
                return Ok(());
            }

            let mut data_json = serde_json::from_str::<serde_json::Value>(&data_str)
                .unwrap_or_else(|_| serde_json::json!({}));

            if category == "workflows" {
                let (session_id, artifact_type) = extract_auto_draft_binding(&title, &content, &data_json);
                if let (Some(sid), Some(atype)) = (session_id, artifact_type) {
                    let feature = conn
                        .query_row(
                            "SELECT branch FROM sessions WHERE id = ?1",
                            rusqlite::params![sid.clone()],
                            |row| row.get::<_, String>(0),
                        )
                        .unwrap_or_else(|_| sid.clone());

                    let description = "Auto-materialized from approved compliance draft";
                    let existing_id = conn
                        .query_row(
                            "SELECT id FROM artifacts WHERE session_id = ?1 AND type = ?2 ORDER BY created_at DESC LIMIT 1",
                            rusqlite::params![sid.clone(), atype.clone()],
                            |row| row.get::<_, String>(0),
                        )
                        .optional()?;

                    let artifact_id = if let Some(existing) = existing_id {
                        conn.execute(
                            "UPDATE artifacts SET session_id = ?1, type = ?2, feature = ?3, status = 'active', title = ?4, description = ?5, content = ?6, updated_at = ?7 WHERE id = ?8",
                            rusqlite::params![sid.clone(), atype.clone(), feature, title, description, content, now_ms, existing],
                        )?;
                        existing
                    } else {
                        let new_id = Uuid::new_v4().to_string();
                        conn.execute(
                            "INSERT INTO artifacts (id, session_id, type, feature, status, title, description, content, date, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 'active', ?5, ?6, ?7, ?8, ?8, ?8)",
                            rusqlite::params![new_id, sid.clone(), atype.clone(), feature, title, description, content, now_ms],
                        )?;
                        new_id
                    };

                    data_json["sessionId"] = serde_json::json!(sid);
                    data_json["artifactType"] = serde_json::json!(atype);
                    data_json["artifactId"] = serde_json::json!(artifact_id);
                }
            }

            data_json["approvedAt"] = serde_json::json!(now.clone());
            let data_updated = serde_json::to_string(&data_json)
                .unwrap_or_else(|_| "{}".to_string());

            conn.execute(
                "UPDATE drafts SET status = 'approved', data = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![data_updated, now, id],
            )?;
            Ok(())
        })
    }

    fn reject_draft(&self, id: &str, reason: &str) -> Result<(), String> {
        let id = id.to_string();
        let reason = reason.to_string();
        let now = Self::now_iso();
        self.safe_write(move |conn| {
            conn.execute(
                "UPDATE drafts SET status = 'rejected', \
                 data = json_set(data, '$.rejectedReason', ?1), updated_at = ?2 WHERE id = ?3",
                rusqlite::params![reason, now, id],
            )?;
            Ok(())
        })
    }

    fn delete_session(&self, id: &str) -> Result<(), String> {
        let id = id.to_string();
        self.safe_write(move |conn| {
            // Cascade: delete observations first, then the session
            conn.execute("DELETE FROM observations WHERE session_id = ?1", rusqlite::params![id])?;
            conn.execute("DELETE FROM sessions WHERE id = ?1", rusqlite::params![id])?;
            Ok(())
        })
    }

    fn update_session(&self, id: &str, branch: Option<&str>, input: Option<&str>, output: Option<&str>) -> Result<(), String> {
        let id = id.to_string();
        let branch = branch.map(|s| s.to_string());
        let input = input.map(|s| s.to_string());
        let output = output.map(|s| s.to_string());
        self.safe_write(move |conn| {
            // Read current data blob
            let current_data: String = conn.query_row(
                "SELECT data FROM sessions WHERE id = ?1",
                [&id],
                |row| row.get(0),
            )?;
            let mut data: serde_json::Value = serde_json::from_str(&current_data)
                .unwrap_or(serde_json::json!({}));

            if let Some(ref branch_val) = branch {
                data["branch"] = serde_json::json!(branch_val);
            }
            if let Some(ref input_val) = input {
                data["input"] = serde_json::json!(input_val);
            }
            if let Some(ref output_val) = output {
                data["output"] = serde_json::json!(output_val);
            }

            let updated = serde_json::to_string(&data).unwrap_or_default();
            // Update both the branch column and the data blob
            if let Some(ref branch_val) = branch {
                conn.execute(
                    "UPDATE sessions SET branch = ?1, data = ?2 WHERE id = ?3",
                    rusqlite::params![branch_val, updated, id],
                )?;
            } else {
                conn.execute(
                    "UPDATE sessions SET data = ?1 WHERE id = ?2",
                    rusqlite::params![updated, id],
                )?;
            }
            Ok(())
        })
    }

    fn update_session_full(&self, id: &str, updates_json: &str) -> Result<(), String> {
        let id = id.to_string();
        let updates_json = updates_json.to_string();
        self.safe_write(move |conn| {
            // Read current data blob
            let current_data: String = conn.query_row(
                "SELECT data FROM sessions WHERE id = ?1",
                [&id],
                |row| row.get(0),
            )?;
            let mut data: serde_json::Value = serde_json::from_str(&current_data)
                .unwrap_or(serde_json::json!({}));

            let updates: serde_json::Value = serde_json::from_str(&updates_json)
                .unwrap_or(serde_json::json!({}));

            // Deep-merge: overwrite top-level keys, nested-merge for objects
            if let (Some(data_obj), Some(updates_obj)) = (data.as_object_mut(), updates.as_object()) {
                for (key, value) in updates_obj {
                    // Nested objects: merge keys instead of replacing the whole object
                    if (key == "taskClassification" || key == "outcome") && value.is_object() {
                        if let Some(nested) = value.as_object() {
                            let existing = data_obj
                                .entry(key.clone())
                                .or_insert(serde_json::json!({}));
                            if let Some(existing_obj) = existing.as_object_mut() {
                                for (nk, nv) in nested {
                                    existing_obj.insert(nk.clone(), nv.clone());
                                }
                            }
                        }
                    } else {
                        data_obj.insert(key.clone(), value.clone());
                    }
                }
            }

            let updated = serde_json::to_string(&data).unwrap_or_default();

            // Keep indexed columns in sync with the JSON blob.
            let branch_val = updates.get("branch").and_then(|v| v.as_str());
            let started_at_ms: Option<i64> = updates.get("startedAt").and_then(|v| {
                v.as_i64().or_else(|| {
                    v.as_str().and_then(|s| {
                        if let Ok(parsed) = s.parse::<i64>() {
                            Some(parsed)
                        } else {
                            conn.query_row(
                                "SELECT CAST(strftime('%s', ?1) AS INTEGER) * 1000",
                                rusqlite::params![s],
                                |row| row.get::<_, Option<i64>>(0),
                            ).ok().flatten()
                        }
                    })
                })
            });
            let ended_at_ms: Option<Option<i64>> = updates.get("endedAt").map(|v| {
                if v.is_null() {
                    None
                } else if let Some(num) = v.as_i64() {
                    Some(num)
                } else if let Some(s) = v.as_str() {
                    if let Ok(parsed) = s.parse::<i64>() {
                        Some(parsed)
                    } else {
                        conn.query_row(
                            "SELECT CAST(strftime('%s', ?1) AS INTEGER) * 1000",
                            rusqlite::params![s],
                            |row| row.get::<_, Option<i64>>(0),
                        ).ok().flatten()
                    }
                } else {
                    None
                }
            });

            match (branch_val, started_at_ms, ended_at_ms) {
                (Some(branch), Some(started), Some(ended)) => {
                    conn.execute(
                        "UPDATE sessions SET branch = ?1, started_at = ?2, ended_at = ?3, data = ?4 WHERE id = ?5",
                        rusqlite::params![branch, started, ended, updated, id],
                    )?;
                }
                (Some(branch), Some(started), None) => {
                    conn.execute(
                        "UPDATE sessions SET branch = ?1, started_at = ?2, data = ?3 WHERE id = ?4",
                        rusqlite::params![branch, started, updated, id],
                    )?;
                }
                (Some(branch), None, Some(ended)) => {
                    conn.execute(
                        "UPDATE sessions SET branch = ?1, ended_at = ?2, data = ?3 WHERE id = ?4",
                        rusqlite::params![branch, ended, updated, id],
                    )?;
                }
                (Some(branch), None, None) => {
                    conn.execute(
                        "UPDATE sessions SET branch = ?1, data = ?2 WHERE id = ?3",
                        rusqlite::params![branch, updated, id],
                    )?;
                }
                (None, Some(started), Some(ended)) => {
                    conn.execute(
                        "UPDATE sessions SET started_at = ?1, ended_at = ?2, data = ?3 WHERE id = ?4",
                        rusqlite::params![started, ended, updated, id],
                    )?;
                }
                (None, Some(started), None) => {
                    conn.execute(
                        "UPDATE sessions SET started_at = ?1, data = ?2 WHERE id = ?3",
                        rusqlite::params![started, updated, id],
                    )?;
                }
                (None, None, Some(ended)) => {
                    conn.execute(
                        "UPDATE sessions SET ended_at = ?1, data = ?2 WHERE id = ?3",
                        rusqlite::params![ended, updated, id],
                    )?;
                }
                (None, None, None) => {
                    conn.execute(
                        "UPDATE sessions SET data = ?1 WHERE id = ?2",
                        rusqlite::params![updated, id],
                    )?;
                }
            }
            Ok(())
        })
    }

    // --- Observation CRUD ---

    fn create_observation(
        &self,
        session_id: &str,
        obs_type: &str,
        title: &str,
        narrative: Option<&str>,
        facts: Option<&str>,
        concepts: Option<&str>,
        files_read: Option<&str>,
        files_modified: Option<&str>,
        discovery_tokens: Option<i64>,
    ) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();
        let session_id = session_id.to_string();
        let obs_type = obs_type.to_string();
        let title = title.to_string();
        let narrative = narrative.map(|s| s.to_string());
        let facts = facts.map(|s| s.to_string());
        let concepts = concepts.map(|s| s.to_string());
        let files_read = files_read.map(|s| s.to_string());
        let files_modified = files_modified.map(|s| s.to_string());
        let now = Self::now_iso();
        let id_clone = id.clone();
        self.safe_write(move |conn| {
            conn.execute(
                "INSERT INTO observations (id, session_id, type, title, content, facts, concepts, files_read, files_modified, discovery_tokens, created_at) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                rusqlite::params![
                    id_clone,
                    session_id,
                    obs_type,
                    title,
                    narrative.as_deref().unwrap_or(""),
                    facts.as_deref().unwrap_or("[]"),
                    concepts.as_deref().unwrap_or("[]"),
                    files_read.as_deref().unwrap_or("[]"),
                    files_modified.as_deref().unwrap_or("[]"),
                    discovery_tokens.unwrap_or(0),
                    now,
                ],
            )?;
            Ok(id_clone.clone())
        })
    }

    fn update_observation(
        &self,
        id: &str,
        obs_type: &str,
        title: &str,
        narrative: Option<&str>,
        facts: Option<&str>,
        concepts: Option<&str>,
        files_read: Option<&str>,
        files_modified: Option<&str>,
        discovery_tokens: Option<i64>,
    ) -> Result<(), String> {
        let id = id.to_string();
        let obs_type = obs_type.to_string();
        let title = title.to_string();
        let narrative = narrative.unwrap_or("").to_string();
        let facts = facts.unwrap_or("[]").to_string();
        let concepts = concepts.unwrap_or("[]").to_string();
        let files_read = files_read.unwrap_or("[]").to_string();
        let files_modified = files_modified.unwrap_or("[]").to_string();
        self.safe_write(move |conn| {
            conn.execute(
                "UPDATE observations SET type = ?1, title = ?2, content = ?3, facts = ?4, concepts = ?5, files_read = ?6, files_modified = ?7, discovery_tokens = ?8 WHERE id = ?9",
                rusqlite::params![obs_type, title, narrative, facts, concepts, files_read, files_modified, discovery_tokens.unwrap_or(0), id],
            )?;
            Ok(())
        })
    }

    fn delete_observation(&self, id: &str) -> Result<(), String> {
        let id = id.to_string();
        self.safe_write(move |conn| {
            conn.execute("DELETE FROM observations WHERE id = ?1", rusqlite::params![id])?;
            Ok(())
        })
    }

    // --- Evolution Candidate CRUD ---

    fn create_evolution_candidate(
        &self,
        evo_type: &str,
        title: &str,
        confidence: f64,
        data: &str,
    ) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();
        let evo_type = evo_type.to_string();
        let title = title.to_string();
        let data = data.to_string();
        let now = Self::now_iso();
        let id_clone = id.clone();
        self.safe_write(move |conn| {
            conn.execute(
                "INSERT INTO evolution_candidates (id, type, title, confidence, status, data, created_at, updated_at) \
                 VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6, ?6)",
                rusqlite::params![id_clone, evo_type, title, confidence, data, now],
            )?;
            Ok(id_clone.clone())
        })
    }

    fn update_evolution_candidate_entry(
        &self,
        id: &str,
        evo_type: &str,
        title: &str,
        confidence: f64,
        data: &str,
    ) -> Result<(), String> {
        let id = id.to_string();
        let evo_type = evo_type.to_string();
        let title = title.to_string();
        let data = data.to_string();
        let now = Self::now_iso();
        self.safe_write(move |conn| {
            conn.execute(
                "UPDATE evolution_candidates SET type = ?1, title = ?2, confidence = ?3, data = ?4, updated_at = ?5 WHERE id = ?6",
                rusqlite::params![evo_type, title, confidence, data, now, id],
            )?;
            Ok(())
        })
    }

    fn delete_evolution_candidate(&self, id: &str) -> Result<(), String> {
        let id = id.to_string();
        self.safe_write(move |conn| {
            conn.execute("DELETE FROM evolution_candidates WHERE id = ?1", rusqlite::params![id])?;
            Ok(())
        })
    }

    // --- Draft CRUD ---

    fn create_draft(
        &self,
        category: &str,
        title: &str,
        filename: &str,
        content: &str,
        confidence: f64,
        source: &str,
    ) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();
        let category = category.to_string();
        let title = title.to_string();
        let content = content.to_string();
        let now = Self::now_iso();
        let mut data_json = serde_json::json!({
            "filename": filename,
            "confidence": confidence,
            "source": source,
        });
        let (session_id, artifact_type) = extract_auto_draft_binding(&title, &content, &data_json);
        if let Some(sid) = session_id {
            data_json["sessionId"] = serde_json::json!(sid);
        }
        if let Some(atype) = artifact_type {
            data_json["artifactType"] = serde_json::json!(atype);
        }
        let data = data_json.to_string();
        let id_clone = id.clone();
        self.safe_write(move |conn| {
            conn.execute(
                "INSERT INTO drafts (id, category, title, content, status, data, created_at, updated_at) \
                 VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6, ?6)",
                rusqlite::params![id_clone, category, title, content, data, now],
            )?;
            Ok(id_clone.clone())
        })
    }

    fn update_draft(&self, id: &str, title: &str, content: &str, category: &str, confidence: Option<f64>, filename: Option<&str>) -> Result<(), String> {
        let id = id.to_string();
        let title = title.to_string();
        let content = content.to_string();
        let category = category.to_string();
        let confidence = confidence;
        let filename = filename.map(|s| s.to_string());
        let now = Self::now_iso();
        self.safe_write(move |conn| {
            conn.execute(
                "UPDATE drafts SET title = ?1, content = ?2, category = ?3, updated_at = ?4 WHERE id = ?5",
                rusqlite::params![title, content, category, now, id],
            )?;
            // Update confidence and filename in the data JSON blob
            if let Some(conf) = confidence {
                conn.execute(
                    "UPDATE drafts SET data = json_set(data, '$.confidence', ?1) WHERE id = ?2",
                    rusqlite::params![conf, id],
                )?;
            }
            if let Some(ref fname) = filename {
                conn.execute(
                    "UPDATE drafts SET data = json_set(data, '$.filename', ?1) WHERE id = ?2",
                    rusqlite::params![fname, id],
                )?;
            }
            Ok(())
        })
    }

    fn delete_draft(&self, id: &str) -> Result<(), String> {
        let id = id.to_string();
        self.safe_write(move |conn| {
            conn.execute("DELETE FROM drafts WHERE id = ?1", rusqlite::params![id])?;
            Ok(())
        })
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
                started_at INTEGER NOT NULL DEFAULT 0,
                ended_at INTEGER,
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
            rusqlite::params![
                "s1",
                "main",
                1767225600000_i64,
                1767229200000_i64,
                "completed",
                r#"{"id":"s1","branch":"main","startedAt":"2026-01-01T00:00:00Z"}"#
            ],
        ).unwrap();
        conn.execute(
            "INSERT INTO sessions (id, branch, started_at, status, data) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                "s2",
                "feat/test",
                1767312000000_i64,
                "active",
                r#"{"id":"s2","branch":"feat/test","startedAt":"2026-01-02T00:00:00Z"}"#
            ],
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

    #[test]
    fn auto_draft_binding_is_extracted_from_title() {
        let title = "Auto Draft: checklist for session mlfc4ewl-egb58r";
        let content = "# Auto";
        let data = serde_json::json!({});
        let (session_id, artifact_type) = extract_auto_draft_binding(title, content, &data);
        assert_eq!(session_id, Some("mlfc4ewl-egb58r".to_string()));
        assert_eq!(artifact_type, Some("checklist".to_string()));
    }

    #[test]
    fn auto_draft_binding_prefers_data_payload() {
        let title = "Some other title";
        let content = "- sessionId: ignored\n- artifactType: ignored";
        let data = serde_json::json!({
            "sessionId": "session-from-data",
            "artifactType": "retro"
        });
        let (session_id, artifact_type) = extract_auto_draft_binding(title, content, &data);
        assert_eq!(session_id, Some("session-from-data".to_string()));
        assert_eq!(artifact_type, Some("retro".to_string()));
    }
}
