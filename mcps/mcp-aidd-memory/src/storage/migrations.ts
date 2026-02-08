// ---------------------------------------------------------------------------
// AIDD Memory — SQLite Schema (single SCHEMA, no migrations)
// ---------------------------------------------------------------------------

export const SCHEMA = `
-- AIDD Memory Schema
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

-- Meta (schema checksum + system metadata)
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  memory_session_id TEXT,
  parent_session_id TEXT,
  branch TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  model_id TEXT,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_branch ON sessions(branch);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_memory_sid ON sessions(memory_session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_model_id ON sessions(model_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);

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

-- Permanent memory
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

-- Branches
CREATE TABLE IF NOT EXISTS branches (
  name TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

-- Evolution candidates
CREATE TABLE IF NOT EXISTS evolution_candidates (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  model_scope TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_evo_cand_type ON evolution_candidates(type);
CREATE INDEX IF NOT EXISTS idx_evo_cand_confidence ON evolution_candidates(confidence);
CREATE INDEX IF NOT EXISTS idx_evo_cand_model_scope ON evolution_candidates(model_scope);

-- Evolution log
CREATE TABLE IF NOT EXISTS evolution_log (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  action TEXT NOT NULL,
  title TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_evo_log_candidate ON evolution_log(candidate_id);

-- Evolution snapshots
CREATE TABLE IF NOT EXISTS evolution_snapshots (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  before_state TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

-- Drafts
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  data TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drafts_category ON drafts(category);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);

-- Lifecycle sessions
CREATE TABLE IF NOT EXISTS lifecycle_sessions (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  feature TEXT NOT NULL,
  current_phase TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  phases TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lifecycle_status ON lifecycle_sessions(status);

-- Banned patterns
CREATE TABLE IF NOT EXISTS banned_patterns (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  pattern TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'regex',
  severity TEXT NOT NULL DEFAULT 'medium',
  model_scope TEXT,
  origin TEXT NOT NULL DEFAULT 'system',
  active INTEGER NOT NULL DEFAULT 1,
  use_count INTEGER NOT NULL DEFAULT 0,
  hint TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_banned_active ON banned_patterns(active);
CREATE INDEX IF NOT EXISTS idx_banned_model_scope ON banned_patterns(model_scope);
CREATE INDEX IF NOT EXISTS idx_banned_category ON banned_patterns(category);

-- Pattern detections
CREATE TABLE IF NOT EXISTS pattern_detections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  model_id TEXT NOT NULL,
  pattern_id TEXT,
  matched_text TEXT NOT NULL,
  context TEXT,
  source TEXT NOT NULL DEFAULT 'auto',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pdet_session ON pattern_detections(session_id);
CREATE INDEX IF NOT EXISTS idx_pdet_model ON pattern_detections(model_id);
CREATE INDEX IF NOT EXISTS idx_pdet_pattern ON pattern_detections(pattern_id);
CREATE INDEX IF NOT EXISTS idx_pdet_created ON pattern_detections(created_at);

-- Artifacts (workflow-produced documents)
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  type TEXT NOT NULL,
  feature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type);
CREATE INDEX IF NOT EXISTS idx_artifacts_feature ON artifacts(feature);
CREATE INDEX IF NOT EXISTS idx_artifacts_status ON artifacts(status);
CREATE INDEX IF NOT EXISTS idx_artifacts_date ON artifacts(date);
CREATE INDEX IF NOT EXISTS idx_artifacts_session ON artifacts(session_id);

-- Audit scores
CREATE TABLE IF NOT EXISTS audit_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  model_id TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  scores TEXT NOT NULL,
  verdict TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_model ON audit_scores(model_id);
CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_scores(session_id);
`;
