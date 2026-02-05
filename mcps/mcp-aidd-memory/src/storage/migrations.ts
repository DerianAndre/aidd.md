export const SCHEMA_V1 = `
-- AIDD Memory Schema v1
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL
);
INSERT INTO schema_version (version) VALUES (1);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  memory_session_id TEXT,
  parent_session_id TEXT,
  branch TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_branch ON sessions(branch);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_memory_sid ON sessions(memory_session_id);

-- Observations
CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  facts TEXT,
  concepts TEXT,
  files_read TEXT,
  files_modified TEXT,
  discovery_tokens INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_observations_session ON observations(session_id);
CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type);
CREATE INDEX IF NOT EXISTS idx_observations_created ON observations(created_at);

-- FTS5 for observations
CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
  title, content, facts, concepts,
  content='observations', content_rowid='rowid',
  tokenize='porter unicode61'
);

-- FTS sync triggers for observations
CREATE TRIGGER IF NOT EXISTS observations_ai AFTER INSERT ON observations BEGIN
  INSERT INTO observations_fts(rowid, title, content, facts, concepts)
  VALUES (new.rowid, new.title, new.content, new.facts, new.concepts);
END;
CREATE TRIGGER IF NOT EXISTS observations_ad AFTER DELETE ON observations BEGIN
  INSERT INTO observations_fts(observations_fts, rowid, title, content, facts, concepts)
  VALUES ('delete', old.rowid, old.title, old.content, old.facts, old.concepts);
END;
CREATE TRIGGER IF NOT EXISTS observations_au AFTER UPDATE ON observations BEGIN
  INSERT INTO observations_fts(observations_fts, rowid, title, content, facts, concepts)
  VALUES ('delete', old.rowid, old.title, old.content, old.facts, old.concepts);
  INSERT INTO observations_fts(rowid, title, content, facts, concepts)
  VALUES (new.rowid, new.title, new.content, new.facts, new.concepts);
END;

-- Permanent memory (indexed copy of JSON files)
CREATE TABLE IF NOT EXISTS permanent_memory (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  session_id TEXT
);

-- FTS5 for permanent memory
CREATE VIRTUAL TABLE IF NOT EXISTS permanent_memory_fts USING fts5(
  title, content,
  content='permanent_memory', content_rowid='rowid',
  tokenize='porter unicode61'
);

-- FTS sync triggers for permanent memory
CREATE TRIGGER IF NOT EXISTS pm_ai AFTER INSERT ON permanent_memory BEGIN
  INSERT INTO permanent_memory_fts(rowid, title, content)
  VALUES (new.rowid, new.title, new.content);
END;
CREATE TRIGGER IF NOT EXISTS pm_ad AFTER DELETE ON permanent_memory BEGIN
  INSERT INTO permanent_memory_fts(permanent_memory_fts, rowid, title, content)
  VALUES ('delete', old.rowid, old.title, old.content);
END;
CREATE TRIGGER IF NOT EXISTS pm_au AFTER UPDATE ON permanent_memory BEGIN
  INSERT INTO permanent_memory_fts(permanent_memory_fts, rowid, title, content)
  VALUES ('delete', old.rowid, old.title, old.content);
  INSERT INTO permanent_memory_fts(rowid, title, content)
  VALUES (new.rowid, new.title, new.content);
END;

-- Tool usage analytics
CREATE TABLE IF NOT EXISTS tool_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  result_quality TEXT NOT NULL,
  duration_ms INTEGER,
  timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tool_usage_name ON tool_usage(tool_name);

-- Lifecycle sessions
CREATE TABLE IF NOT EXISTS lifecycle_sessions (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  feature TEXT NOT NULL,
  current_phase TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  phases TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lifecycle_status ON lifecycle_sessions(status);
`;
