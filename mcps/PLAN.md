# AIDD MCP Ecosystem — Development Plan

> Implementation roadmap for the AIDD MCP ecosystem.
> **Status**: Planning | **Date**: 2026-02-05

---

## 1. Vision

Transform AIDD from a static file-based standard into an autonomous, self-improving AI development companion distributed as npm packages. The system serves AIDD guidance, enforces methodology, persists memory across sessions, tracks AI model performance, and autonomously evolves the framework based on real-world outcomes.

**Three identities, one default package**:
- **The Brain** (Core) — guidance, routing, knowledge
- **The Memory** — persistence, sessions, evolution, analytics
- **The Hands** (Tools) — validation, enforcement, CI/CD

---

## 2. Architecture

### Approach C: Engine Default + Optional Split

```
┌─────────────────────────────────────────────────┐
│              @aidd.md/mcp-engine (ENGINE)              │
│         Default. One process. All modules.       │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Core   │  │  Memory  │  │  Tools   │       │
│  │ modules  │  │ modules  │  │ modules  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       └──────────────┼──────────────┘            │
│              Direct function calls               │
│              (same process)                       │
└─────────────────────────────────────────────────┘
                     OR
┌──────────┐  ┌──────────┐  ┌──────────┐
│@aidd.md/ │  │@aidd.md/ │  │@aidd.md/ │
│mcp-core  │  │mcp-memory│  │mcp-tools │
│(Brain)   │  │(Memory)  │  │(Hands)   │
└──────────┘  └──────────┘  └──────────┘
  3 separate processes — AI orchestrates
```

- **Engine** = simpler setup (1 MCP), direct inter-module calls, lower resource usage
- **Split** = granular control, resource isolation, independent scaling for HTTP transport

### Distribution: npm Packages

```
@aidd.md/mcp-engine   ← Engine (default, recommended — all modules)
@aidd.md/mcp-core     ← Split: brain only
@aidd.md/mcp-memory   ← Split: memory only
@aidd.md/mcp-tools    ← Split: tools only
@aidd.md/mcp-shared   ← Internal shared dependency
```

Usage: `npx @aidd.md/mcp-engine` — no global install, no copying.

### Stack

- TypeScript 5.9 (strict mode)
- @modelcontextprotocol/sdk (latest)
- Node.js 22 LTS
- Zod 4
- better-sqlite3 (optional — memory backend with FTS5 full-text search)
- pnpm 10 (workspace)
- tsup (build)
- Vitest 4 (testing)
- Both transports: stdio + Streamable HTTP

### Storage Architecture (Hybrid)

Dual-backend approach inspired by claude-mem's production patterns:

| Data Type                        | Backend                                     | Reason                                        |
| -------------------------------- | ------------------------------------------- | --------------------------------------------- |
| Decisions, conventions, mistakes | JSON in `ai/memory/`                        | Git-visible, team-shared, diffable            |
| Session state, observations      | SQLite in `.aidd/data.db`                   | Transient, high-write, concurrent, gitignored |
| Branch context                   | JSON in `.aidd/branches/`                   | Git-visible per decision                      |
| Analytics, TKB cache             | SQLite in `.aidd/data.db`                   | Aggregation queries, indexed search           |
| Evolution log, drafts            | JSON in `.aidd/evolution/`, `.aidd/drafts/` | Audit trail, human-reviewable                 |
| Search index                     | SQLite FTS5                                 | Full-text search performance                  |

SQLite is optional — JSON backend provides zero-dependency fallback via `StorageBackend` interface.

### 3-Layer Search Pattern

Token-efficient memory retrieval (inspired by claude-mem — ~10x token savings):

```
search(query) → compact index (~50-100 tokens/result)
context(anchorId) → timeline around a result
get(ids[]) → full details ONLY for filtered IDs (~500-1000 tokens/result)
```

---

## 3. Repository Structure

```
packages/
├── shared/                       # @aidd.md/mcp-shared
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsup.config.ts
│   └── src/
│       ├── index.ts              # Public API exports
│       ├── types.ts              # AiddModule, ModuleContext, SessionState, BranchContext
│       ├── server.ts             # createAiddServer() factory
│       ├── response.ts           # createTextResult(), createJsonResult(), createErrorResult()
│       ├── content-loader.ts     # ContentLoader: bundled + project + merge strategy
│       ├── project-detector.ts   # Scan for AIDD files, package.json parsing
│       ├── fs.ts                 # readFileOrNull(), readJsonFile(), writeJsonFile(), writeFileSafe()
│       ├── paths.ts              # findProjectRoot(), fromRoot(), paths object
│       ├── logger.ts             # Structured logger
│       ├── utils.ts              # Markdown parsing, frontmatter extraction
│       └── schemas.ts            # Shared Zod schemas

mcps/
├── mcp-aidd-engine/              # @aidd.md/mcp-engine (engine — all modules)
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsup.config.ts
│   └── src/
│       ├── index.ts              # Registers ALL modules from core + memory + tools
│       ├── server.ts             # Engine server creation
│       └── transport/
│           ├── stdio.ts
│           └── http.ts
│
├── mcp-aidd-core/                # @aidd.md/mcp-core
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsup.config.ts
│   ├── src/
│   │   ├── index.ts
│   │   ├── server.ts
│   │   ├── modules/
│   │   │   ├── index.ts
│   │   │   ├── bootstrap/        # aidd_bootstrap, aidd_detect_project, aidd_get_config
│   │   │   ├── routing/          # aidd_classify_task, aidd_get_routing_table
│   │   │   ├── knowledge/        # aidd_query_tkb, aidd_get_tkb_entry, aidd_get_agent, aidd_get_competency_matrix
│   │   │   ├── guidance/         # aidd_apply_heuristics, aidd_suggest_next, aidd_tech_compatibility
│   │   │   ├── context/          # aidd_optimize_context
│   │   │   └── scaffold/         # aidd_scaffold
│   │   └── transport/
│   ├── content/bundled/
│   ├── scripts/
│   │   └── bundle-content.ts
│   └── __tests__/
│
├── mcp-aidd-memory/              # @aidd.md/mcp-memory
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsup.config.ts
│   ├── src/
│   │   ├── index.ts
│   │   ├── server.ts
│   │   ├── storage/
│   │   │   ├── storage-backend.ts  # StorageBackend interface
│   │   │   ├── json-backend.ts     # JSON file ops (zero-dependency fallback)
│   │   │   ├── sqlite-backend.ts   # SQLite + FTS5 + WAL (optional, better-sqlite3)
│   │   │   ├── factory.ts          # Auto-select: SQLite if available, fallback JSON
│   │   │   └── migrations/         # SQLite schema versioning
│   │   ├── modules/
│   │   │   ├── index.ts
│   │   │   ├── session/          # aidd_session (multi-action)
│   │   │   ├── branch/           # aidd_branch (multi-action)
│   │   │   ├── memory/           # 3-layer search: search, context, get + CRUD
│   │   │   ├── observation/      # aidd_observation (typed observations with discoveryTokens)
│   │   │   ├── lifecycle/        # ASDD lifecycle sessions
│   │   │   ├── evolution/        # Pattern recognition, auto-apply, snapshots, rollback
│   │   │   ├── drafts/           # Content authoring: create, list, approve
│   │   │   ├── analytics/        # Passive tracking + model performance
│   │   │   └── diagnostics/      # aidd_diagnose_error, aidd_project_health
│   │   └── transport/
│   └── __tests__/
│
└── mcp-aidd-tools/               # @aidd.md/mcp-tools
    ├── package.json
    ├── tsconfig.json
    ├── tsup.config.ts
    ├── src/
    │   ├── index.ts
    │   ├── server.ts
    │   ├── cli.ts                # CI mode entrypoint
    │   ├── modules/
    │   │   ├── index.ts
    │   │   ├── validation/       # 11 validators (pure functions)
    │   │   │   └── validators/
    │   │   ├── enforcement/      # compliance, version-verify, quality-gates, explain-violation
    │   │   ├── execution/        # commit-message, migration-planner
    │   │   └── ci/               # CI mode: report generation, diff-check
    │   └── transport/
    ├── content/bundled/
    ├── scripts/
    │   └── bundle-content.ts
    └── __tests__/
```

---

## 4. Core Types

### Module Interface

```typescript
interface AiddModule {
  readonly name: string;
  readonly description: string;
  register(server: McpServer, context: ModuleContext): void;
  onReady?(context: ModuleContext): Promise<void>;
}

interface ModuleContext {
  contentLoader: ContentLoader;
  projectInfo: ProjectInfo;
  config: AiddConfig;
  logger: Logger;
}
```

### Tool Definition

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  schema: ZodRawShape;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  handler: (args: Record<string, unknown>) => Promise<ToolResult>;
}
```

### Session State (Memory Layer 1)

```typescript
interface SessionState {
  id: string;
  memorySessionId?: string;   // Shared across related sessions (threading)
  parentSessionId?: string;   // Links to previous session in thread
  branch: string;
  started_at: string;
  ended_at?: string;
  ai_provider: {
    provider: string;    // "anthropic", "openai", "google", "ollama", etc
    model: string;       // "claude-opus-4-6", "gpt-4o", "gemini-2.0"
    model_id: string;    // "claude-opus-4-6"
    client: string;      // "claude-code", "cursor", "windsurf"
    model_tier?: string; // "claude-opus-4-6", "claude-sonnet-4-5", "claude-haiku-4-5", "gemini-2.5-pro", "gemini-2.5-flash"
  };
  decisions: Array<{ decision: string; reasoning: string; timestamp: string }>;
  errors_resolved: Array<{ error: string; fix: string; timestamp: string }>;
  files_modified: string[];
  tasks_completed: string[];
  tasks_pending: string[];
  agents_used: string[];
  skills_used: string[];
  tools_called: Array<{ name: string; result_quality: "good" | "neutral" | "bad" }>;
  rules_applied: string[];
  workflows_followed: string[];
  tkb_entries_consulted: string[];
  task_classification: { domain: string; nature: string; complexity: string };
  outcome?: {
    tests_passing: boolean;
    compliance_score: number;
    reverts: number;
    reworks: number;
    user_feedback?: "positive" | "neutral" | "negative";
  };
  lifecycle_session_id?: string;
}
```

### Branch Context (Memory Layer 2)

```typescript
interface BranchContext {
  branch: string;
  feature?: string;
  phase?: string;
  spec?: string;
  plan?: string;
  completed_tasks: string[];
  pending_tasks: string[];
  decisions: Array<{ decision: string; reasoning: string; session_id: string }>;
  errors_encountered: Array<{ error: string; fix: string; session_id: string }>;
  files_modified: string[];
  sessions_count: number;
  total_duration_ms: number;
  lifecycle_session_id?: string;
  updated_at: string;
}
```

### Memory Search Types (3-Layer Pattern)

```typescript
/** Observation type — covers existing + extensible types. */
type ObservationType =
  | 'decision' | 'mistake' | 'convention'       // existing
  | 'pattern' | 'preference' | 'insight'         // new
  | 'tool_outcome' | 'workflow_outcome';          // new

/** Compact index entry (~50-100 tokens). Layer 1 of 3-layer search. */
interface MemoryIndexEntry {
  id: string;
  type: ObservationType;
  title: string;
  snippet: string;
  createdAt: string;
  sessionId?: string;
  relevanceScore?: number;
}

/** Timeline context around anchor. Layer 2 of 3-layer search. */
interface MemoryTimelineEntry {
  anchor: MemoryIndexEntry;
  before: MemoryIndexEntry[];
  after: MemoryIndexEntry[];
}

/** Full entry returned by batch get. Layer 3 of 3-layer search. */
interface MemoryEntry {
  id: string;
  type: ObservationType;
  title: string;
  content: string;
  facts?: string[];
  narrative?: string;
  concepts?: string[];
  filesRead?: string[];
  filesModified?: string[];
  discoveryTokens?: number;
  createdAt: string;
  sessionId?: string;
}
```

### Session Observation

```typescript
/** Generic typed observation captured during sessions. */
interface SessionObservation {
  id: string;
  sessionId: string;
  type: ObservationType;
  title: string;
  facts?: string[];
  narrative?: string;
  concepts?: string[];
  filesRead?: string[];
  filesModified?: string[];
  discoveryTokens?: number;   // Token cost to discover this info (ROI metric)
  createdAt: string;
}
```

### Context Budget

```typescript
/** Token allocation for context injection via aidd_optimize_context. */
interface ContextBudget {
  totalTokens: number;       // e.g. 4000
  headerTokens: number;      // Project info, config (~200)
  memoryTokens: number;      // Decisions, conventions (~1500)
  sessionTokens: number;     // Current session state (~500)
  suggestionTokens: number;  // Next steps (~300)
  reserveTokens: number;     // Buffer (~500)
}
```

### Storage Backend

```typescript
/** Abstract storage — JSON and SQLite implementations. */
interface StorageBackend {
  readonly name: string;
  initialize(): Promise<void>;
  close(): Promise<void>;

  // Sessions
  saveSession(session: SessionState): Promise<void>;
  getSession(id: string): Promise<SessionState | null>;
  listSessions(filter?: SessionFilter): Promise<MemoryIndexEntry[]>;

  // Observations
  saveObservation(observation: SessionObservation): Promise<void>;
  getObservation(id: string): Promise<SessionObservation | null>;

  // Search (3-layer)
  search(query: string, options?: SearchOptions): Promise<MemoryIndexEntry[]>;
  getTimeline(anchorId: string, depth?: number): Promise<MemoryTimelineEntry>;
  getByIds(ids: string[]): Promise<MemoryEntry[]>;

  // Analytics
  recordToolUsage(entry: ToolUsageEntry): Promise<void>;
  getAnalytics(query: AnalyticsQuery): Promise<AnalyticsResult>;
}
```

---

## 5. Tool Inventory (63 total)

### Core: The Brain (17 tools)

| #   | Tool                         | Purpose                                                                      | Annotations |
| --- | ---------------------------- | ---------------------------------------------------------------------------- | ----------- |
| 1   | `aidd_detect_project`        | Scan directory for AIDD markers + parse package.json stack                   | readOnly    |
| 2   | `aidd_get_config`            | Return active MCP configuration                                              | readOnly    |
| 3   | `aidd_bootstrap`             | One-call conversation start: project + agents + rules + memory + suggestions | readOnly    |
| 4   | `aidd_classify_task`         | Task → agent roles, workflows, templates (decision-tree.md)                  | readOnly    |
| 5   | `aidd_get_routing_table`     | Complete routing table from templates/routing.md                             | readOnly    |
| 6   | `aidd_query_tkb`             | Filter/search TKB by category, maturity, keyword, use case                   | readOnly    |
| 7   | `aidd_get_tkb_entry`         | Full content of a specific TKB entry                                         | readOnly    |
| 8   | `aidd_get_agent`             | Agent SKILL.md with parsed frontmatter                                       | readOnly    |
| 9   | `aidd_get_competency_matrix` | Cross-agent expertise matrix                                                 | readOnly    |
| 10  | `aidd_apply_heuristics`      | Run a decision through AIDD's 10 heuristics                                  | readOnly    |
| 11  | `aidd_tech_compatibility`    | Stack compatibility analysis with scores                                     | readOnly    |
| 12  | `aidd_suggest_next`          | Context-aware next step suggestions with pre-filled tool args                | readOnly    |
| 13  | `aidd_optimize_context`      | Token-budget-aware context filtering                                         | readOnly    |
| 14  | `aidd_scaffold`              | Initialize AIDD in a project (minimal/standard/full)                         | write       |

### Memory: The Memory (27 tools)

| #   | Tool                         | Purpose                                                                   | Annotations |
| --- | ---------------------------- | ------------------------------------------------------------------------- | ----------- |
| 1   | `aidd_session`               | Multi-action: start, update, end, get, list (Layer 1) + session threading | write       |
| 2   | `aidd_branch`                | Multi-action: get, save, promote, list, merge (Layer 2)                   | write       |
| 3   | `aidd_memory_search`         | 3-layer L1: compact index search (~50-100 tokens/result)                  | readOnly    |
| 4   | `aidd_memory_context`        | 3-layer L2: timeline view around a specific entry                         | readOnly    |
| 5   | `aidd_memory_get`            | 3-layer L3: fetch full details by IDs (batch)                             | readOnly    |
| 6   | `aidd_memory_add_decision`   | Record architectural decision with rationale                              | write       |
| 7   | `aidd_memory_add_mistake`    | Record mistake with root cause + fix + prevention                         | write       |
| 8   | `aidd_memory_add_convention` | Record project convention with examples                                   | write       |
| 9   | `aidd_observation`           | Record typed observation with discoveryTokens (pattern, insight, etc.)    | write       |
| 10  | `aidd_memory_prune`          | Remove outdated entries                                                   | destructive |
| 11  | `aidd_lifecycle_get`         | ASDD 8-phase definition with entry/exit criteria                          | readOnly    |
| 12  | `aidd_lifecycle_init`        | Initialize new ASDD session                                               | write       |
| 13  | `aidd_lifecycle_advance`     | Advance phase after verifying exit criteria                               | write       |
| 14  | `aidd_lifecycle_status`      | Current lifecycle session state                                           | readOnly    |
| 15  | `aidd_lifecycle_list`        | List all lifecycle sessions                                               | readOnly    |
| 16  | `aidd_evolution_analyze`     | Analyze sessions, identify patterns, generate candidates                  | readOnly    |
| 17  | `aidd_evolution_status`      | Engine learnings + pending changes                                        | readOnly    |
| 18  | `aidd_evolution_review`      | Review auto-changes before/after apply                                    | readOnly    |
| 19  | `aidd_evolution_revert`      | Undo an auto-applied change                                               | destructive |
| 20  | `aidd_draft_create`          | Generate draft artifact in `.aidd/drafts/`                                | write       |
| 21  | `aidd_draft_list`            | List pending drafts with confidence scores                                | readOnly    |
| 22  | `aidd_draft_approve`         | Promote draft to AIDD directory                                           | write       |
| 23  | `aidd_model_performance`     | AI provider/model performance metrics                                     | readOnly    |
| 24  | `aidd_model_compare`         | Side-by-side model comparison                                             | readOnly    |
| 25  | `aidd_model_recommend`       | Task-type-aware model recommendation                                      | readOnly    |
| 26  | `aidd_diagnose_error`        | Search memory for similar past mistakes + fixes                           | readOnly    |
| 27  | `aidd_project_health`        | Data-driven health score from analytics                                   | readOnly    |

### Tools: The Hands (19 tools)

| #   | Tool                           | Purpose                                        | Annotations |
| --- | ------------------------------ | ---------------------------------------------- | ----------- |
| 1   | `aidd_validate_mermaid`        | Validate Mermaid diagram syntax                | readOnly    |
| 2   | `aidd_validate_openapi`        | Validate OpenAPI specification                 | readOnly    |
| 3   | `aidd_validate_sql`            | Validate SQL syntax and patterns               | readOnly    |
| 4   | `aidd_validate_tests`          | Validate test file structure and coverage      | readOnly    |
| 5   | `aidd_validate_dockerfile`     | Validate Dockerfile best practices             | readOnly    |
| 6   | `aidd_validate_i18n`           | Validate internationalization files            | readOnly    |
| 7   | `aidd_validate_tkb_entry`      | Validate TKB entry format                      | readOnly    |
| 8   | `aidd_validate_design_tokens`  | Validate design token files                    | readOnly    |
| 9   | `aidd_audit_accessibility`     | WCAG accessibility audit                       | readOnly    |
| 10  | `aidd_audit_performance`       | Performance audit by framework                 | readOnly    |
| 11  | `aidd_scan_secrets`            | Scan for exposed secrets                       | readOnly    |
| 12  | `aidd_check_compliance`        | Check code against AIDD rules                  | readOnly    |
| 13  | `aidd_verify_version`          | 4-step Version Verification Protocol           | readOnly    |
| 14  | `aidd_check_quality_gates`     | Validate ASDD quality gates                    | readOnly    |
| 15  | `aidd_explain_violation`       | Explain why a rule exists with examples        | readOnly    |
| 16  | `aidd_generate_commit_message` | Analyze changes → conventional commit          | readOnly    |
| 17  | `aidd_plan_migration`          | Framework upgrade plan with guardrails         | readOnly    |
| 18  | `aidd_ci_report`               | CI/CD compliance report (github/json/markdown) | readOnly    |
| 19  | `aidd_ci_diff_check`           | Check only changed files for compliance        | readOnly    |

---

## 6. 5-Layer Memory Model

```
┌─────────────────────────────────────────────────────┐
│  Layer 5: EVOLUTION                                 │
│  Scope: Cross-session patterns                       │
│  Storage: .aidd/evolution/                           │
│  Contains: Pattern analysis, auto-improvements,      │
│            confidence scores, framework mutations     │
├─────────────────────────────────────────────────────┤
│  Layer 4: PERMANENT                                  │
│  Scope: Project lifetime                             │
│  Storage: ai/memory/ (decisions, mistakes,           │
│           conventions) or project memory files        │
├─────────────────────────────────────────────────────┤
│  Layer 3: LIFECYCLE                                  │
│  Scope: Feature/task lifecycle (ASDD 8 phases)       │
│  Storage: .aidd/sessions/active/<id>.json            │
├─────────────────────────────────────────────────────┤
│  Layer 2: BRANCH                                     │
│  Scope: Git branch (survives session restarts)       │
│  Storage: .aidd/branches/<branch>.json               │
├─────────────────────────────────────────────────────┤
│  Layer 1: SESSION                                    │
│  Scope: Single AI conversation                       │
│  Storage: .aidd/sessions/active/<id>.json            │
└─────────────────────────────────────────────────────┘
```

**Promotion flow**: Session → Branch → Permanent (via evolution engine or manual).

---

## 7. `.aidd/` Directory

```
.aidd/
├── config.json                 # Project-level MCP config overrides
├── data.db                     # SQLite database (sessions, analytics, search index)
├── sessions/
│   ├── active/                 # In-progress session files (JSON fallback only)
│   └── completed/              # Finished sessions (JSON fallback only)
├── branches/
│   ├── <branch-name>.json      # Branch-level context (always JSON — Git-visible)
│   └── archive/                # Merged branch contexts
├── drafts/
│   ├── rules/                  # Draft rules awaiting approval
│   ├── knowledge/              # Draft TKB entries
│   ├── skills/                 # Draft skill definitions
│   ├── workflows/              # Draft workflows
│   └── manifest.json           # All drafts: status, metadata, confidence
├── analytics/                  # JSON fallback (SQLite preferred)
│   ├── tool-usage.json         # Tool call frequency + patterns
│   ├── rule-violations.json    # Violation hotspots
│   ├── tkb-queries.json        # Technology exploration patterns
│   ├── lifecycle-metrics.json  # Phase durations + bottlenecks
│   └── model-performance.json  # AI provider/model benchmarking
├── evolution/
│   ├── log.json                # All evolution actions (audit trail — always JSON)
│   ├── pending.json            # Changes building toward confidence threshold
│   └── snapshots/              # Framework state snapshots for rollback
├── cache/
│   ├── tkb-index.json          # Parsed TKB frontmatter cache
│   └── content-hash.json       # Content change detection
└── .gitignore                  # Private: data.db, sessions/active/, cache/
                                # Shared: branches/, drafts/, evolution/log.json
```

**Storage routing**: When SQLite backend is available, `data.db` handles sessions, analytics, search index, and TKB cache. When unavailable, falls back to JSON files in the directories above. Branch contexts and evolution logs are always JSON for Git visibility.

---

## 8. Evolution Engine

### How It Works

1. **Instrumentation** — Every session records: agents, skills, tools (with quality), AI provider/model/client, rules, workflows, TKB entries, outcome metrics.

2. **Pattern recognition** — After sessions complete:
   - Which agent/skill combos lead to better outcomes
   - Which rule violations always result in reverts
   - Which tool sequences always appear together
   - Which TKB entries correlate with fewer mistakes
   - Which AI models perform best for which task types

3. **Confidence-based auto-apply**:
   - **>90%, 10+ sessions**: Auto-apply, notify user
   - **70-90%, 5-10 sessions**: Create draft in `.aidd/drafts/`
   - **<70%, <5 sessions**: Log to `.aidd/evolution/pending.json`

4. **Safeguards**:
   - Audit trail in `.aidd/evolution/log.json`
   - Snapshots in `.aidd/evolution/snapshots/` for rollback
   - Configurable thresholds in `.aidd/config.json`
   - Kill switch to disable
   - Learning period (first N sessions = data only)

### Evolution Types

| Observation                        | Auto-Improvement             |
| ---------------------------------- | ---------------------------- |
| Agent X better for task type Y     | Update routing weights       |
| Skill combo A+B > A alone          | Update agent skill sets      |
| Rule violation always reverted     | Elevate rule severity        |
| Tools X→Y→Z always together        | Create compound workflow     |
| TKB entry X = fewer mistakes       | Promote TKB entry            |
| Recurring mistake pattern          | Draft new rule/convention    |
| Model A outperforms B for frontend | Update model recommendations |

---

## 9. Content Loading

### Bundled Content (build time)

A build script copies AIDD framework files into the npm package:
- AGENTS.md, specs/, rules/, skills/, workflows/, templates/, knowledge/

### Project Detection (runtime)

1. Scan for AIDD markers: AGENTS.md, rules/, skills/, workflows/
2. Check `ai/` prefix variant
3. Check `ai/memory/` then `memory/` for memory layer
4. Check `.aidd/` for MCP state
5. Parse package.json for stack detection

### Merge Strategy (default: `"merge"`)

| Content   | Behavior                                          |
| --------- | ------------------------------------------------- |
| AGENTS.md | Project wins entirely (SSOT)                      |
| Rules     | Project overrides by filename, additions included |
| Skills    | Project overrides by agent name                   |
| Workflows | Project overrides by filename                     |
| Templates | Project overrides by filename                     |
| Knowledge | Merged by path, project overrides bundled         |
| Memory    | Project-only (never from bundled)                 |
| Specs     | Bundled-only (specs define the standard)          |

---

## 10. Patterns From EnXingaPay

Proven patterns to port from the EnXingaPay MCP implementation:

| Pattern          | Source                                | Adaptation                                                        |
| ---------------- | ------------------------------------- | ----------------------------------------------------------------- |
| Server factory   | `mcp-shared/src/server.ts`            | `createAiddServer()` with error handling                          |
| Response helpers | `mcp-shared/src/response.ts`          | `createTextResult()`, `createJsonResult()`, `createErrorResult()` |
| FS utilities     | `mcp-shared/src/fs.ts`                | `readFileOrNull()`, `readJsonFile()`, `writeJsonFile()`           |
| Path resolution  | `mcp-shared/src/paths.ts`             | `findProjectRoot()`, `fromRoot()`, `paths`                        |
| Session state    | `mcp-memory/tools/memory-session.ts`  | Multi-action tool (get/start/update/end)                          |
| Branch context   | `mcp-memory/tools/memory-branch.ts`   | Multi-action tool (get/save/promote/list/merge)                   |
| Mistake tracking | `mcp-memory/tools/memory-mistakes.ts` | Occurrence counting, similarity matching                          |

---

## 11. Implementation Phases

### Phase 1: Foundation

| #   | Task                                                                      | Package       |
| --- | ------------------------------------------------------------------------- | ------------- |
| 1   | Initialize `mcps/` workspace with pnpm workspace config                   | root          |
| 2   | Types, server factory, response helpers, FS utils, paths, logger, schemas | shared        |
| 3   | Monolithic package: server skeleton, transport (stdio + HTTP)             | mcp-aidd      |
| 4   | Core split package: setup, server skeleton                                | mcp-aidd-core |
| 5   | Content bundling build script                                             | scripts       |

### Phase 2: Core Brain

| #   | Task                                                                                       | Module    |
| --- | ------------------------------------------------------------------------------------------ | --------- |
| 6   | detect_project, get_config, bootstrap                                                      | bootstrap |
| 7   | classify_task, routing_table (implements decision-tree.md)                                 | routing   |
| 8   | TKB indexing, query engine, get_agent, competency_matrix                                   | knowledge |
| 9   | apply_heuristics, suggest_next, tech_compatibility                                         | guidance  |
| 10  | optimize_context + **ContextBuilder pipeline** (token-budget-aware progressive disclosure) | context   |
| 11  | AIDD project initialization                                                                | scaffold  |
| 12  | Resources + Prompts for core                                                               | core      |

### Phase 3: Memory Foundation

| #    | Task                                                                                                                                                                         | Module          |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 13   | Memory split package: setup, server skeleton                                                                                                                                 | mcp-aidd-memory |
| 13.5 | **Storage backend abstraction**: `StorageBackend` interface, JSON backend (zero-dep), SQLite backend (FTS5 + WAL), factory (auto-select with fallback), migrations           | storage         |
| 14   | Multi-action session tool (Layer 1) **+ session threading** (`memorySessionId`, `parentSessionId`)                                                                           | session         |
| 15   | Multi-action branch tool (Layer 2)                                                                                                                                           | branch          |
| 16   | **3-layer search**: `aidd_memory_search` (compact index), `aidd_memory_context` (timeline), `aidd_memory_get` (batch full details) + CRUD for decisions/mistakes/conventions | memory          |
| 16.5 | **Observation system**: `aidd_observation` tool — typed observations with `discoveryTokens` ROI tracking                                                                     | observation     |
| 17   | ASDD sessions, phase validation (Layer 3)                                                                                                                                    | lifecycle       |

### Phase 4: Evolution Engine

| #   | Task                                                                                                        | Module    |
| --- | ----------------------------------------------------------------------------------------------------------- | --------- |
| 18  | Passive tracking (tool usage, violations, TKB queries, model perf) — **use SQLite backend for aggregation** | analytics |
| 19  | Session recording, pattern recognition, **ROI-weighted confidence scoring via discoveryTokens**             | evolution |
| 20  | Auto-apply engine, snapshots, rollback, log                                                                 | evolution |
| 21  | Content authoring: create drafts, list, approve/reject                                                      | drafts    |
| 22  | aidd_model_performance, aidd_model_compare, aidd_model_recommend                                            | analytics |

### Phase 5: Diagnostics

| #   | Task                                                                  | Module      |
| --- | --------------------------------------------------------------------- | ----------- |
| 23  | diagnose_error (mistake matching), project_health (data-driven score) | diagnostics |

### Phase 6: Tools Foundation

| #   | Task                                                          | Module         |
| --- | ------------------------------------------------------------- | -------------- |
| 24  | Tools split package: setup, server skeleton                   | mcp-aidd-tools |
| 25  | ValidationIssue interface, common utils                       | validation     |
| 26  | Port 11 validators from `skills/*/scripts/` to pure functions | validation     |
| 27  | Register all 11 validation tools                              | validation     |

### Phase 7: Enforcement + Execution

| #   | Task                                                                     | Module      |
| --- | ------------------------------------------------------------------------ | ----------- |
| 28  | Compliance checker, version verifier, quality gates, violation explainer | enforcement |
| 29  | Commit message generator, migration planner                              | execution   |
| 30  | CI mode: report generation (github/json/markdown), diff-check            | ci          |

### Phase 8: Monolithic Integration

| #   | Task                                      | Package  |
| --- | ----------------------------------------- | -------- |
| 31  | Wire all modules into monolithic package  | mcp-aidd |
| 32  | Verify all 60 tools register correctly    | mcp-aidd |
| 33  | Verify cross-module direct function calls | mcp-aidd |

### Phase 8.5: Hook Templates (Optional Automation)

| #    | Task                                                                                                                                                                        | Deliverable                    |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 33.5 | Claude Code hook templates: `session-start.mjs` (context injection via `aidd_bootstrap`), `post-tool-use.mjs` (observation capture), `session-end.mjs` (summary generation) | `templates/hooks/claude-code/` |
| 33.6 | Cursor integration template: `.cursorrules` with AIDD context                                                                                                               | `templates/hooks/cursor/`      |
| 33.7 | Hook installation documentation + setup script                                                                                                                              | `templates/hooks/README.md`    |

### Phase 9: Testing

| #   | Task                                                                | Scope  |
| --- | ------------------------------------------------------------------- | ------ |
| 34  | Unit tests for shared (content-loader, project-detector, FS utils)  | shared |
| 35  | Unit tests per module (routing, TKB, memory, evolution, validators) | all    |
| 36  | Integration tests: stdio transport (spawn + stdin/stdout)           | all    |
| 37  | Integration tests: HTTP transport (request/response)                | all    |
| 38  | MCP Inspector testing (manual verification)                         | all    |

### Phase 10: Documentation & Polish

| #   | Task                                   | Deliverable                 |
| --- | -------------------------------------- | --------------------------- |
| 39  | Architecture overview                  | `mcps/README.md`            |
| 40  | README.md for each package             | per-package                 |
| 41  | Update adapter docs                    | `adapters/claude/README.md` |
| 42  | Usage examples and configuration guide | docs                        |
| 43  | DX commands documentation              | root package.json           |

---

## 12. Key Decisions

| Decision              | Choice                                                             | Rationale                                                       |
| --------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| Approach C            | Monolithic + split                                                 | Simple default OR granular control                              |
| npm distribution      | `npx` packages                                                     | Standard MCP pattern, auto-updates                              |
| 5-layer memory        | Session → Branch → Lifecycle → Permanent → Evolution               | Complete coverage                                               |
| AI model tracking     | Per-session recording                                              | Real-world benchmarking                                         |
| Shared package        | `@aidd.md/mcp-shared`                                              | DRY: factory, helpers, utils, types                             |
| EnXingaPay patterns   | Server factory, FS, memory                                         | Proven, not reinventing                                         |
| Hybrid content        | Bundle + project override                                          | Works anywhere                                                  |
| Hybrid storage        | SQLite (sessions, analytics, search) + JSON (decisions, evolution) | Performance where needed, Git visibility where it matters       |
| 3-layer search        | search → context → get                                             | ~10x token savings vs full-entry retrieval (claude-mem pattern) |
| Session threading     | `memorySessionId` + `parentSessionId`                              | Memory continuity across reconnects (claude-mem pattern)        |
| Typed observations    | Extensible `ObservationType` union with `discoveryTokens` ROI      | Rich data for evolution engine pattern recognition              |
| Token-budget context  | `ContextBudget` with progressive disclosure                        | Smarter context injection within token limits                   |
| Privacy tags          | `<private>` tag stripping before storage                           | Prevent accidental credential/PII exposure in memory            |
| Optional hooks        | Templates in `templates/hooks/`                                    | Zero-friction automation without sacrificing portability        |
| Confidence thresholds | Default 90%                                                        | Safe automation                                                 |
| Draft pipeline        | `.aidd/drafts/`                                                    | Review before changes land                                      |
| Pure validators       | Refactored from scripts                                            | Same code in MCP + CI                                           |
| tsup                  | Build system                                                       | Fast, ESM + CJS, clean config                                   |

---

## 13. Files to Reference During Implementation

### AIDD Framework

| File                                                  | Used By                     |
| ----------------------------------------------------- | --------------------------- |
| `rules/decision-tree.md`                              | Core: routing classifier    |
| `specs/asdd-lifecycle.md`                             | Memory: lifecycle phases    |
| `specs/memory-layer.md`                               | Memory: schemas             |
| `specs/heuristics.md`                                 | Core: 10 heuristics         |
| `specs/version-protocol.md`                           | Tools: version verifier     |
| `specs/bluf-6.md`                                     | Core: prompts               |
| `templates/routing.md`                                | Core: routing table         |
| `rules/interfaces.md`                                 | Memory: evolution contracts |
| `skills/system-architect/scripts/validate-mermaid.ts` | Tools: validator pattern    |

### MCP References

| File                                                                        | Purpose                  |
| --------------------------------------------------------------------------- | ------------------------ |
| `researchs/repos/skills/skills/mcp-builder/reference/node_mcp_server.md`    | MCP SDK patterns         |
| `researchs/repos/skills/skills/mcp-builder/reference/mcp_best_practices.md` | Tool naming, annotations |

### EnXingaPay Patterns

| File                                                | Pattern              |
| --------------------------------------------------- | -------------------- |
| `packages/shared/src/server.ts`                     | Server factory       |
| `packages/shared/src/fs.ts`                         | FS utilities         |
| `packages/shared/src/paths.ts`                      | Path resolution      |
| `mcps/mcp-aidd-memory/src/modules/session/index.ts` | Session multi-action |
| `mcps/mcp-aidd-memory/src/modules/branch/index.ts`  | Branch multi-action  |
| `mcps/mcp-aidd-memory/src/modules/memory/index.ts`  | Mistake tracking     |

---

## 14. Verification

### Automated
- `pnpm run typecheck` — zero errors
- `pnpm run test` — all passing
- `pnpm run build` — clean build
- `pnpm run lint` — no violations

### Manual
- Configure monolithic MCP in Claude Code
- Run `aidd_bootstrap` against aidd.md repo
- Run `aidd_classify_task` with various descriptions
- Run `aidd_query_tkb` and verify entries
- Create lifecycle session, advance through phases
- Test session → branch → session end → branch merge
- Run validators against sample files
- Test CI mode: `npx @aidd.md/mcp-tools ci --report=json`
- Test evolution: record sessions, verify patterns
- Test model analytics with different providers

### MCP Inspector
- Verify all 58 tools appear with correct schemas
- Test tool calls interactively
- Verify resources resolve correctly

---

## Summary

| Package   | npm                   | Tools        | Identity                                           |
| --------- | --------------------- | ------------ | -------------------------------------------------- |
| Engine    | `@aidd.md/mcp-engine` | 63           | All-in-one (recommended)                           |
| Core      | `@aidd.md/mcp-core`   | 17           | The Brain                                          |
| Memory    | `@aidd.md/mcp-memory` | 27           | The Memory                                         |
| Tools     | `@aidd.md/mcp-tools`  | 19           | The Hands                                          |
| Shared    | `@aidd.md/mcp-shared` | —            | Types, factory, utils, storage                     |
| **Total** |                       | **63 tools** | + 13 resources, 5 prompts, CI mode, hook templates |

### Key Improvements (from claude-mem analysis)

| Improvement                             | Impact                            | Source            |
| --------------------------------------- | --------------------------------- | ----------------- |
| 3-layer search (search → context → get) | ~10x token savings                | claude-mem        |
| Hybrid storage (SQLite + JSON)          | Performance + Git visibility      | claude-mem + AIDD |
| Token-budget context injection          | Smarter context within limits     | claude-mem        |
| Session threading                       | Memory continuity across sessions | claude-mem        |
| Typed observations with discoveryTokens | ROI tracking for evolution        | claude-mem        |
| Privacy tag stripping                   | Credential/PII protection         | claude-mem        |
| Optional hook templates                 | Zero-friction automation          | claude-mem        |
