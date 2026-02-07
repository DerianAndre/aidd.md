use rusqlite::{Connection, OpenFlags};
use std::path::PathBuf;
use std::sync::Arc;

use crate::domain::ports::inbound::{
    MemoryPort, SessionSummary, SessionInfo, ObservationEntry, EvolutionStatus, PatternStats, ProjectPort,
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
                "SELECT COALESCE(SUM(false_positive_count), 0) FROM pattern_detections",
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
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    /// Create an in-memory database with the full AIDD schema
    fn create_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE sessions (
                id TEXT PRIMARY KEY,
                branch TEXT NOT NULL DEFAULT '',
                started_at TEXT NOT NULL DEFAULT '',
                ended_at TEXT,
                ai_provider TEXT NOT NULL DEFAULT '{}',
                decisions TEXT NOT NULL DEFAULT '[]',
                errors_resolved TEXT NOT NULL DEFAULT '[]',
                files_modified TEXT NOT NULL DEFAULT '[]',
                tasks_completed TEXT NOT NULL DEFAULT '[]',
                tasks_pending TEXT NOT NULL DEFAULT '[]',
                tools_called TEXT NOT NULL DEFAULT '[]',
                outcome TEXT,
                memory_session_id TEXT,
                parent_session_id TEXT,
                task_classification TEXT,
                token_usage TEXT
            );
            CREATE TABLE observations (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT '',
                title TEXT NOT NULL DEFAULT '',
                narrative TEXT,
                facts TEXT NOT NULL DEFAULT '[]',
                concepts TEXT NOT NULL DEFAULT '[]',
                files_read TEXT NOT NULL DEFAULT '[]',
                files_modified TEXT NOT NULL DEFAULT '[]',
                discovery_tokens INTEGER,
                created_at TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE evolution_candidates (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL DEFAULT '',
                title TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                evidence TEXT NOT NULL DEFAULT '[]',
                confidence REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'pending',
                source TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT '',
                content TEXT,
                target_path TEXT,
                model_scope TEXT
            );
            CREATE TABLE evolution_log (
                id TEXT PRIMARY KEY,
                candidate_id TEXT NOT NULL,
                action TEXT NOT NULL DEFAULT '',
                timestamp TEXT NOT NULL DEFAULT '',
                details TEXT
            );
            CREATE TABLE banned_patterns (
                id TEXT PRIMARY KEY,
                pattern TEXT NOT NULL DEFAULT '',
                type TEXT NOT NULL DEFAULT 'exact',
                category TEXT NOT NULL DEFAULT '',
                severity TEXT NOT NULL DEFAULT 'medium',
                hint TEXT,
                model_scope TEXT,
                source TEXT NOT NULL DEFAULT 'manual',
                active INTEGER NOT NULL DEFAULT 1,
                use_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE pattern_detections (
                id TEXT PRIMARY KEY,
                pattern_id TEXT NOT NULL,
                session_id TEXT,
                model_id TEXT,
                matched_text TEXT,
                detected_at TEXT NOT NULL DEFAULT '',
                false_positive_count INTEGER NOT NULL DEFAULT 0
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

        // Insert test sessions
        conn.execute(
            "INSERT INTO sessions (id, branch, started_at, ended_at) VALUES (?1, ?2, ?3, ?4)",
            ["s1", "main", "2026-01-01T00:00:00Z", "2026-01-01T01:00:00Z"],
        ).unwrap();
        conn.execute(
            "INSERT INTO sessions (id, branch, started_at) VALUES (?1, ?2, ?3)",
            ["s2", "feat/test", "2026-01-02T00:00:00Z"],
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
            "INSERT INTO evolution_candidates (id, status) VALUES (?1, ?2)",
            ["e1", "pending"],
        ).unwrap();
        conn.execute(
            "INSERT INTO evolution_candidates (id, status) VALUES (?1, ?2)",
            ["e2", "pending"],
        ).unwrap();
        conn.execute(
            "INSERT INTO evolution_candidates (id, status) VALUES (?1, ?2)",
            ["e3", "approved"],
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
