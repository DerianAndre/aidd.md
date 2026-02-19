# AIDD Configuration Reference

> Complete reference for the `.aidd/` directory, `config.json`, environment variables, and storage architecture.

**Last Updated**: 2026-02-18

---

## Table of Contents

- [AIDD Configuration Reference](#aidd-configuration-reference)
  - [Table of Contents](#table-of-contents)
  - [Directory Structure](#directory-structure)
  - [config.json Reference](#configjson-reference)
    - [Evolution thresholds](#evolution-thresholds)
    - [Content override modes](#content-override-modes)
    - [Content paths](#content-paths)
    - [CI categories](#ci-categories)
  - [Environment Variables](#environment-variables)
  - [SQLite Database](#sqlite-database)
    - [Tables (18)](#tables-18)
    - [Schema checksum](#schema-checksum)
    - [WAL mode](#wal-mode)
    - [Pruning](#pruning)
  - [Git Strategy](#git-strategy)
    - [Gitignored (per-developer, private)](#gitignored-per-developer-private)
    - [Committed (shared, team-visible)](#committed-shared-team-visible)
    - [Recommended .gitignore](#recommended-gitignore)
  - [Auto-Generated Files](#auto-generated-files)
  - [Setup](#setup)
    - [Create `.aidd/` automatically](#create-aidd-automatically)
    - [Create `.aidd/` via MCP tool](#create-aidd-via-mcp-tool)
    - [Create `.aidd/` manually](#create-aidd-manually)
  - [Diagnostics](#diagnostics)

---

## Directory Structure

```
.aidd/                          # Project root directory
├── config.json                 # Configuration (committed)
├── .gitignore                  # Controls what's shared vs private
├── data.db                     # SQLite database (gitignored)
├── data.db-wal                 # WAL journal (gitignored)
├── data.db-shm                 # Shared memory (gitignored)
├── content/                    # Project AIDD content
│   ├── agents/                 # Agent definitions (index.md + per-agent)
│   ├── rules/                  # Domain-specific rules
│   ├── skills/                 # Agent capabilities (SKILL.md)
│   ├── workflows/              # Multi-step procedures
│   ├── specs/                  # Specifications
│   ├── knowledge/              # Technology Knowledge Base
│   └── templates/              # Task templates
├── memory/                     # Permanent memory (committed)
│   ├── decisions.json          # Architectural decisions
│   ├── mistakes.json           # Mistakes + fixes
│   ├── conventions.json        # Project conventions
│   ├── insights.md             # Auto-learning dashboard
│   └── state-dump.sql          # Diffable state export
├── sessions/
│   ├── active/                 # In-progress sessions (gitignored)
│   └── completed/              # Completed session summaries
├── branches/                   # Git branch context
│   └── archive/                # Archived branch context
├── drafts/                     # Evolution engine drafts (committed)
│   ├── rules/                  # Draft rules
│   ├── knowledge/              # Draft TKB entries
│   ├── skills/                 # Draft skills
│   └── workflows/              # Draft workflows
├── analytics/                  # Aggregated analytics
├── evolution/                  # Evolution engine state
│   └── snapshots/              # Framework snapshots (rollback)
└── cache/                      # Temporary cache (gitignored)
```

---

## config.json Reference

The config file lives at `.aidd/config.json`. All fields are optional — missing fields use defaults from `DEFAULT_CONFIG` in `packages/shared/src/types.ts`.

```jsonc
{
  // Evolution engine — learns from sessions, auto-improves framework
  "evolution": {
    "enabled": true,                      // Enable/disable evolution engine
    "autoApplyThreshold": 90,             // Confidence % to auto-apply changes (0-100)
    "draftThreshold": 70,                 // Confidence % to create drafts (0-100)
    "learningPeriodSessions": 5,          // Sessions before evolution starts acting
    "killSwitch": false                   // Emergency stop — disables all evolution
  },

  // Memory layer — session history, pruning, promotion
  "memory": {
    "maxSessionHistory": 100,             // Max completed sessions to keep
    "autoPromoteBranchDecisions": true,   // Auto-promote branch decisions to permanent
    "pruneAfterDays": 90                  // Delete data older than N days
  },

  // AI model tracking — records which models are used per session
  "modelTracking": {
    "enabled": true,                      // Track AI provider/model per session
    "crossProject": false                 // Share model data across projects
  },

  // CI/CD compliance — configures which rules block, warn, or are ignored
  "ci": {
    "blockOn": [                          // Categories that fail CI
      "security_critical",
      "type_safety"
    ],
    "warnOn": [                           // Categories that produce warnings
      "code_style",
      "documentation"
    ],
    "ignore": [                           // Categories to skip entirely
      "commit_format"
    ]
  },

  // Content loading — how bundled vs project content merges
  "content": {
    "overrideMode": "merge",              // "merge" | "project_only" | "bundled_only"
    "sessionTracking": true,              // true = full DB tracking, false = workflow-only (no DB), undefined = setup prompt
    "tokenBudget": "standard",            // "minimal" (~400 tok) | "standard" (~600 tok) | "full" (~800+ tok)

    // Custom content paths — all optional, relative to project root
    "paths": {
      "content": "content",               // Base content directory (default: "content")
      "agents": "content/agents",          // Agents directory (default: "content/agents")
      "rules": "content/rules",           // Rules directory (default: "content/rules")
      "skills": "content/skills",         // Skills directory (default: "content/skills")
      "workflows": "content/workflows",   // Workflows directory (default: "content/workflows")
      "specs": "content/specs",           // Specs directory (default: "content/specs")
      "knowledge": "content/knowledge",   // Knowledge base directory (default: "content/knowledge")
      "templates": "content/templates"    // Templates directory (default: "content/templates")
    }
  }
}
```

### Evolution thresholds

| Confidence | Sessions | Action                               |
| ---------- | -------- | ------------------------------------ |
| >= 90%     | >= 10    | Auto-apply, notify user              |
| 70-89%     | 5-9      | Create draft in `.aidd/drafts/`      |
| < 70%      | < 5      | Store as pending candidate in SQLite |

### Content override modes

| Mode           | Behavior                                                       |
| -------------- | -------------------------------------------------------------- |
| `merge`        | Project files override bundled by filename; additions included |
| `project_only` | Only use project-level AIDD files                              |
| `bundled_only` | Only use files bundled in the npm package                      |

### Content paths

All paths in `content.paths` are relative to the `.aidd/` root. Every field is optional — missing fields use defaults.

**Priority**: Granular paths (e.g. `paths.rules`) take priority over the base `paths.content` directory. This means you can move the entire content directory *and* override individual subdirectories independently.

| Field       | Default               | Description                                                                                         |
| ----------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| `content`   | `"content"`           | Base content directory. All subdirectories resolve relative to this unless overridden individually. |
| `agents`    | `"content/agents"`    | Agents directory.                                                                                   |
| `rules`     | `"content/rules"`     | Rules directory.                                                                                    |
| `skills`    | `"content/skills"`    | Skills directory.                                                                                   |
| `workflows` | `"content/workflows"` | Workflows directory.                                                                                |
| `specs`     | `"content/specs"`     | Specifications directory.                                                                           |
| `knowledge` | `"content/knowledge"` | Technology Knowledge Base directory.                                                                |
| `templates` | `"content/templates"` | Templates directory.                                                                                |

**Examples:**

Keep defaults but override one directory:

```jsonc
{
  "content": {
    "overrideMode": "merge",
    "paths": {
      "rules": "my-custom-rules"
    }
  }
}
```

Fully custom layout:

```jsonc
{
  "content": {
    "overrideMode": "project_only",
    "paths": {
      "agents": "docs/AGENTS.md",
      "rules": "config/ai-rules",
      "skills": "config/ai-skills",
      "workflows": "docs/workflows",
      "knowledge": "docs/knowledge"
    }
  }
}
```

### CI categories

Available categories for `blockOn`, `warnOn`, and `ignore`:

- `security_critical` — OWASP vulnerabilities, exposed secrets
- `type_safety` — TypeScript strict violations
- `code_style` — Naming conventions, import patterns
- `documentation` — Missing docs, stale docs
- `commit_format` — Conventional commit format
- `test_coverage` — Test coverage thresholds
- `performance` — Performance budget violations

---

## Environment Variables

Environment variables override config.json values. Set these in your MCP config or shell.

| Variable                     | Values                                  | Default           | Description                     |
| ---------------------------- | --------------------------------------- | ----------------- | ------------------------------- |
| `AIDD_PROJECT_PATH`          | Path                                    | Current directory | Project root for MCP to scan    |
| `AIDD_TRANSPORT`             | `stdio`, `streamable-http`              | `stdio`           | MCP transport protocol          |
| `AIDD_PORT`                  | Number                                  | `3100`            | Port for HTTP transport         |
| `AIDD_LOG_LEVEL`             | `debug`, `info`, `warn`, `error`        | `info`            | Logging verbosity               |
| `AIDD_CONTENT_OVERRIDE_MODE` | `merge`, `project_only`, `bundled_only` | `merge`           | Content merge strategy          |
| `AIDD_EVOLUTION_ENABLED`     | `true`, `false`                         | `true`            | Enable evolution engine         |
| `AIDD_EVOLUTION_THRESHOLD`   | `0-100`                                 | `90`              | Auto-apply confidence threshold |
| `AIDD_MODE`                  | `engine`, `core`, `memory`, `tools`     | `engine`          | Which MCP server mode to run    |

---

## SQLite Database

All persistent state lives in `.aidd/data.db` (SQLite with WAL mode). The database is gitignored — it's per-developer, regenerated from sessions.

### Tables (18)

| Table                  | Purpose                          | Key Fields                                        |
| ---------------------- | -------------------------------- | ------------------------------------------------- |
| `meta`                 | Schema checksum, system metadata | `key`, `value`                                    |
| `sessions`             | Conversation sessions            | `id`, `branch`, `aiProvider`, `outcome`           |
| `observations`         | Typed session observations       | `sessionId`, `type`, `content`, `discoveryTokens` |
| `observations_fts`     | FTS5 full-text search index      | Virtual table over observations                   |
| `permanent_memory`     | Decisions, mistakes, conventions | `type`, `category`, `content`, `tags`             |
| `permanent_memory_fts` | FTS5 full-text search index      | Virtual table over permanent_memory               |
| `tool_usage`           | Tool call tracking               | `sessionId`, `tool`, `quality`, `duration`        |
| `branches`             | Git branch context               | `branch`, `context`, `decisions`                  |
| `evolution_candidates` | Pending evolution candidates     | `type`, `confidence`, `evidence`                  |
| `evolution_log`        | Applied evolution changes        | `candidateId`, `action`, `appliedAt`              |
| `evolution_snapshots`  | Framework state snapshots        | `snapshotId`, `content`, `createdAt`              |
| `drafts`               | Draft artifacts                  | `type`, `name`, `content`, `confidence`           |
| `lifecycle_sessions`   | AIDD 6-phase lifecycle tracking  | `sessionId`, `phase`, `status`                    |
| `banned_patterns`      | AI output anti-patterns          | `pattern`, `category`, `modelScope`               |
| `pattern_detections`   | Pattern detection log            | `patternId`, `sessionId`, `confidence`            |
| `audit_scores`         | 5-dimension text quality scores  | `sessionId`, `scores`, `verdict`                  |
| `artifacts`            | Workflow artifacts (plan, retro) | `id`, `type`, `feature`, `sessionId`, `content`   |
| `health_snapshots`     | Project health score over time   | `sessionId`, `scores`, `overall`, `createdAt`     |

### Schema version

Current schema version: **v4** (migration v4 added `health_snapshots` table). Migrations run automatically on startup.

### Schema checksum

The `meta` table stores a schema checksum. On startup, the MCP verifies the checksum matches the expected schema version. If it drifts, a warning is logged.

### WAL mode

SQLite runs in WAL (Write-Ahead Logging) mode for concurrent read/write access. WAL is checkpointed on session end. The `data.db-wal` and `data.db-shm` files are normal WAL artifacts — they're automatically managed by SQLite.

### Pruning

`pruneStaleData()` runs periodically:
- Pattern detections older than 30 days are deleted
- Observations capped at 1,000 entries
- Sessions capped at 50 (configurable via `memory.maxSessionHistory`)

---

## Git Strategy

The `.aidd/.gitignore` controls what's committed vs private:

### Gitignored (per-developer, private)

| Path               | Reason                                      |
| ------------------ | ------------------------------------------- |
| `sessions/active/` | In-progress sessions are ephemeral          |
| `cache/`           | Temporary computation cache                 |
| `data.db`          | SQLite database (regenerated per developer) |
| `data.db-wal`      | SQLite WAL journal                          |
| `data.db-shm`      | SQLite shared memory                        |

### Committed (shared, team-visible)

| Path                  | Reason                                              |
| --------------------- | --------------------------------------------------- |
| `config.json`         | Team-wide configuration                             |
| `drafts/`             | Evolution-generated draft artifacts for team review |
| `analytics/`          | Aggregated team analytics                           |
| `evolution/`          | Evolution log and snapshots (audit trail)           |
| `branches/`           | Branch context (useful across developers)           |
| `sessions/completed/` | Completed session summaries                         |

### Recommended .gitignore

The default `.gitignore` created by `pnpm setup`:

```gitignore
# Private (per-developer)
sessions/active/
cache/
data.db
data.db-wal
data.db-shm

# Shared (committed)
# analytics/
# drafts/
# evolution/log.json
# config.json
```

---

## Auto-Generated Files

The MCP engine auto-generates these files for git visibility:

| File                          | Purpose                                  | Update Frequency                      |
| ----------------------------- | ---------------------------------------- | ------------------------------------- |
| `.aidd/memory/insights.md`    | Auto-learning dashboard (~150 tokens)    | Every 5th session                     |
| `.aidd/memory/state-dump.sql` | SQL INSERT statements for diffable state | On session end                        |
| `.aidd/memory/*.json`         | Permanent memory export                  | On explicit `aidd_memory_export` call |

These files live in `.aidd/memory/` and are visible in git diffs, providing transparency into what the MCP has learned.

---

## Setup

### Create `.aidd/` automatically

```bash
pnpm setup              # Full setup (recommended)
# or
pnpm mcp:setup          # Alias
```

### Create `.aidd/` via MCP tool

```
aidd_scaffold --preset full    # Creates .aidd/ + config.json + framework files
```

### Create `.aidd/` manually

```bash
mkdir -p .aidd/content/agents .aidd/content/rules \
  .aidd/memory .aidd/sessions/active .aidd/sessions/completed \
  .aidd/branches/archive .aidd/drafts .aidd/analytics \
  .aidd/evolution/snapshots .aidd/cache
```

Then create `.aidd/config.json` with the defaults shown above (or an empty `{}`).

---

## Diagnostics

```bash
pnpm mcp:doctor          # Checks .aidd/ structure, config validity, storage health
pnpm mcp:check           # Quick single-line status
```

The doctor validates:
- `.aidd/` directory exists with required subdirectories
- `config.json` is valid JSON with all expected sections
- SQLite database is accessible (if exists)
- Schema checksum matches expected version
