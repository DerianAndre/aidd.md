# AIDD MCP Ecosystem

> AI-Driven Development made autonomous: 69 tools, 5-layer memory, self-evolving framework.
> **Last Updated**: 2026-02-07
> **Status**: Implementation Complete

---

## Quick Start

### As npm package (end users)

Configure your AI tool to use the MCP server:

**Claude Code** (`~/.claude/mcp.json`):
```json
{
  "mcpServers": {
    "aidd-engine": {
      "command": "npx",
      "args": ["@aidd.md/mcp-engine"],
      "env": { "AIDD_PROJECT_PATH": "${workspaceFolder}" }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "aidd-engine": {
      "command": "npx",
      "args": ["@aidd.md/mcp-engine"],
      "env": { "AIDD_PROJECT_PATH": "${workspaceFolder}" }
    }
  }
}
```

That's it. The MCP detects your project, loads bundled AIDD content, and adapts to any project-level AIDD files it finds.

### From source (contributors / development)

```bash
git clone https://github.com/DerianAndre/aidd.md
cd aidd.md
pnpm install
pnpm setup
```

`pnpm setup` handles everything in 7 steps:

```
[aidd.md] Setup

[1/7] Checking prerequisites...
✅ Node.js v22.x, pnpm 10.x

[2/7] Installing dependencies...
✅ Dependencies installed

[3/7] Building MCP packages...
✅ MCP packages built

[4/7] Initializing project state...
✅ .aidd/ directory initialized

[5/7] Detecting IDE integrations...
  Detected:
    ● Claude Code → ~/.claude/mcp.json
    ● Cursor → .cursor/mcp.json
    ● VS Code → .vscode/mcp.json
    ● Gemini → AGENTS.md (auto-detected)

  Configure these IDEs? [Y/n] Y

  Mode: contributor (local build path)

  ✅ Claude Code — configured
  ✅ Cursor — configured
  ✅ VS Code — configured
  ✅ Gemini — auto-detected

[6/7] Running diagnostics...
[aidd.md] All checks passed!

[7/7] Setup Complete

  Next steps:
    1. Open your IDE and start coding — MCPs auto-start
    2. pnpm mcp:check  — quick status check
    3. pnpm mcp:doctor — full diagnostics
```

Contributors get a local build path (`node dist/index.js`) for fast MCP cold start (<1s). Open your IDE and MCPs auto-start.

---

## Commands

| Command              | Description                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `pnpm setup`         | **Full setup**: install deps + build + detect IDEs + configure + verify (alias: `pnpm mcp:setup`)                  |
| `pnpm mcp:build`     | Build all MCP packages                                                                                             |
| `pnpm mcp:dev`       | Watch mode for development                                                                                         |
| `pnpm mcp:test`      | Run MCP tests                                                                                                      |
| `pnpm mcp:typecheck` | TypeScript type checking                                                                                           |
| `pnpm mcp:clean`     | Clean build artifacts                                                                                              |
| `pnpm mcp:status`    | Quick check — are packages built?                                                                                  |
| `pnpm mcp:doctor`    | Full diagnostic of MCP environment (supports `--json`, `--fix`, `--deep`, `--quiet`, `--no-runtime`, `--no-color`) |
| `pnpm mcp:check`     | Single-line status (for AI agent startup)                                                                          |

### Typical workflow

```bash
# First time (or after major changes)
pnpm setup

# Daily (after pulling latest)
pnpm mcp:check           # quick — single-line status
pnpm mcp:build           # only if check says packages not built

# Something broken?
pnpm mcp:doctor          # full diagnostic with suggested fixes
```

### MCPs not working?

```bash
pnpm mcp:doctor
```

This diagnoses the problem and suggests the solution.

---

## Architecture

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

**Engine** (recommended) — One process, all 69 tools, direct inter-module communication. Simpler setup, lower resource usage.

**Split** — Three processes, granular control. Use when you need resource isolation or only need specific capabilities.

### How It Works

```
AI Tool (Claude Code, Cursor, Windsurf, etc.)
    │
    ├── stdio ──► @aidd.md/mcp-engine (all 69 tools)
    │
    OR
    │
    ├── stdio ──► @aidd.md/mcp-core     (17 tools: guidance, routing, knowledge)
    ├── stdio ──► @aidd.md/mcp-memory   (33 tools: sessions, search, evolution, analytics, pattern-killer)
    └── stdio ──► @aidd.md/mcp-tools    (19 tools: validation, enforcement, CI)
```

Each MCP runs as a Node.js process. The AI tool connects via stdin/stdout using the MCP SDK's stdio transport.

---

## Inventory

### Core: The Brain (17 tools)

| Tool                         | Purpose                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `aidd_detect_project`        | Scan directory for AIDD markers + parse package.json stack                   |
| `aidd_get_config`            | Return active MCP configuration                                              |
| `aidd_bootstrap`             | One-call conversation start: project + agents + rules + memory + suggestions |
| `aidd_classify_task`         | Task description → agent roles, workflows, templates                         |
| `aidd_get_routing_table`     | Complete task→agent→workflow routing table                                   |
| `aidd_query_tkb`             | Filter/search Technology Knowledge Base by category, maturity, keyword       |
| `aidd_get_tkb_entry`         | Full content of a specific TKB entry                                         |
| `aidd_get_agent`             | Agent SKILL.md with parsed frontmatter                                       |
| `aidd_get_competency_matrix` | Cross-agent expertise matrix                                                 |
| `aidd_apply_heuristics`      | Run a decision through AIDD's 10 heuristics                                  |
| `aidd_tech_compatibility`    | Stack compatibility analysis with scores                                     |
| `aidd_suggest_next`          | Context-aware next step suggestions with pre-filled tool args                |
| `aidd_optimize_context`      | Token-budget-aware context filtering                                         |
| `aidd_scaffold`              | Initialize AIDD in a project (minimal/standard/full)                         |

### Memory: The Memory (33 tools)

| Tool                         | Purpose                                                                    |
| ---------------------------- | -------------------------------------------------------------------------- |
| `aidd_session`               | Multi-action session state (start/update/end/get/list) + session threading |
| `aidd_branch`                | Multi-action branch context (get/save/promote/list/merge)                  |
| `aidd_memory_search`         | 3-layer L1: compact index search (~50-100 tokens/result)                   |
| `aidd_memory_context`        | 3-layer L2: timeline view around a specific entry                          |
| `aidd_memory_get`            | 3-layer L3: fetch full details by IDs (batch)                              |
| `aidd_memory_add_decision`   | Record architectural decision with rationale                               |
| `aidd_memory_add_mistake`    | Record mistake with root cause + fix + prevention                          |
| `aidd_memory_add_convention` | Record project convention with examples                                    |
| `aidd_observation`           | Record typed observation with discoveryTokens ROI tracking                 |
| `aidd_memory_prune`          | Remove outdated memory entries                                             |
| `aidd_lifecycle_get`         | AIDD 6-phase definition with entry/exit criteria                           |
| `aidd_lifecycle_init`        | Initialize new AIDD lifecycle session                                      |
| `aidd_lifecycle_advance`     | Advance phase after verifying exit criteria                                |
| `aidd_lifecycle_status`      | Current lifecycle session state                                            |
| `aidd_lifecycle_list`        | List all lifecycle sessions                                                |
| `aidd_evolution_analyze`     | Analyze sessions, identify patterns, generate candidates                   |
| `aidd_evolution_status`      | Engine learnings + pending changes                                         |
| `aidd_evolution_review`      | Review auto-changes before/after apply                                     |
| `aidd_evolution_revert`      | Undo an auto-applied change                                                |
| `aidd_draft_create`          | Generate draft artifact (rule, skill, TKB, workflow)                       |
| `aidd_draft_list`            | List pending drafts with confidence scores                                 |
| `aidd_draft_approve`         | Promote draft to AIDD directory                                            |
| `aidd_model_performance`     | AI provider/model performance metrics                                      |
| `aidd_model_compare`         | Side-by-side model comparison across dimensions                            |
| `aidd_model_recommend`       | Task-type-aware model recommendation                                       |
| `aidd_diagnose_error`        | Search memory for similar past mistakes + fixes                            |
| `aidd_project_health`        | Data-driven health score from analytics                                    |
| `aidd_memory_export`         | Export permanent memory from SQLite to JSON files                          |
| `aidd_pattern_audit`         | Full pattern audit: detect banned patterns, fingerprint, 5D score          |
| `aidd_pattern_list`          | List active banned patterns by category or model scope                     |
| `aidd_pattern_add`           | Add new banned pattern for AI output detection                             |
| `aidd_pattern_stats`         | Pattern detection statistics per model with frequency breakdown            |
| `aidd_pattern_score`         | Quick 5-dimension text quality evaluation with verdict                     |
| `aidd_pattern_false_positive`| Report pattern as false positive, reduce confidence                        |

### Tools: The Hands (19 tools)

| Tool                           | Purpose                                        |
| ------------------------------ | ---------------------------------------------- |
| `aidd_validate_mermaid`        | Validate Mermaid diagram syntax                |
| `aidd_validate_openapi`        | Validate OpenAPI specification                 |
| `aidd_validate_sql`            | Validate SQL syntax and patterns               |
| `aidd_validate_tests`          | Validate test file structure and coverage      |
| `aidd_validate_dockerfile`     | Validate Dockerfile best practices             |
| `aidd_validate_i18n`           | Validate internationalization files            |
| `aidd_validate_tkb_entry`      | Validate TKB entry format                      |
| `aidd_validate_design_tokens`  | Validate design token files                    |
| `aidd_audit_accessibility`     | WCAG accessibility audit                       |
| `aidd_audit_performance`       | Performance audit by framework                 |
| `aidd_scan_secrets`            | Scan for exposed secrets                       |
| `aidd_check_compliance`        | Check code against AIDD rules                  |
| `aidd_verify_version`          | 4-step Version Verification Protocol           |
| `aidd_check_quality_gates`     | Validate AIDD quality gates                    |
| `aidd_explain_violation`       | Explain why a rule exists with examples        |
| `aidd_generate_commit_message` | Analyze changes → conventional commit          |
| `aidd_plan_migration`          | Framework upgrade plan with guardrails         |
| `aidd_ci_report`               | CI/CD compliance report (github/json/markdown) |
| `aidd_ci_diff_check`           | Check only changed files for compliance        |

---

## 5-Layer Memory Model

```
┌─────────────────────────────────────────────────────┐
│  Layer 5: EVOLUTION                                 │
│  Cross-session patterns → auto-framework mutations   │
│  Storage: .aidd/data.db (evolution_candidates, evolution_log tables) │
├─────────────────────────────────────────────────────┤
│  Layer 4: PERMANENT                                  │
│  Project-lifetime decisions, mistakes, conventions   │
│  Storage: .aidd/data.db (permanent_memory table) + .aidd/memory/*.json exports │
├─────────────────────────────────────────────────────┤
│  Layer 3: LIFECYCLE                                  │
│  AIDD 6-phase tracking + quality gates               │
│  Storage: .aidd/data.db (lifecycle_sessions table)   │
├─────────────────────────────────────────────────────┤
│  Layer 2: BRANCH                                     │
│  Git branch context (survives session restarts)      │
│  Storage: .aidd/data.db (branches table)             │
├─────────────────────────────────────────────────────┤
│  Layer 1: SESSION                                    │
│  Single conversation state + AI provider tracking    │
│  Storage: .aidd/data.db (sessions table)             │
└─────────────────────────────────────────────────────┘
```

**Promotion flow**: Session → Branch → Permanent (via evolution engine or manual).

Each session records: agents used, skills used, tools called (with quality), AI provider/model/client, rules applied, workflows followed, TKB entries consulted, and outcome metrics.

---

## Storage Architecture (SQLite-First)

Single SQLite database for all persistent state:

```
┌─────────────────────────────────────────────────┐
│  SQLite (.aidd/data.db) — gitignored            │
│  16 tables: sessions, observations, branches,   │
│  evolution, patterns, memory, lifecycle, etc.    │
│  FTS5 full-text search + WAL concurrent access   │
│  Schema checksum in meta table                   │
├─────────────────────────────────────────────────┤
│  Auto-generated files — Git-visible              │
│  .aidd/memory/insights.md (auto-learning dashboard) │
│  .aidd/memory/state-dump.sql (diffable state)       │
│  .aidd/memory/*.json (on-demand export)             │
└─────────────────────────────────────────────────┘
```

**StorageBackend interface** provides ~30 methods covering all data types. `better-sqlite3` is a required dependency.

### 3-Layer Search Pattern

Token-efficient memory retrieval (~10x savings vs full-entry dumps):

```
aidd_memory_search(query) → compact index  (~50-100 tokens/result)
aidd_memory_context(id)   → timeline view  (context around entry)
aidd_memory_get(ids[])    → full details   (~500-1000 tokens/result)
```

AI filters results between layers, fetching full details only for relevant entries.

---

## Hook Templates (Optional)

AIDD provides optional hook templates for automatic memory capture:

```
templates/hooks/
  claude-code/
    hooks.json          # Claude Code hook definitions
    session-start.mjs   # Auto-inject context via aidd_bootstrap
    post-tool-use.mjs   # Auto-capture observations
    session-end.mjs     # Auto-generate session summary
  cursor/
    .cursorrules         # Cursor-specific integration
```

Hooks call AIDD MCP tools automatically — they're not required. All MCP tools work independently via explicit calls.

---

## AI Model Tracking

Every session records the AI provider and model being used:

```typescript
ai_provider: {
  provider: "anthropic",       // "anthropic", "openai", "google", "ollama"
  model: "claude-opus-4-6",    // human-readable model name
  model_id: "claude-opus-4-6",  // exact model ID
  client: "claude-code",       // "claude-code", "cursor", "windsurf"
  model_tier: "claude-opus-4-6"           // "claude-opus-4-6", "claude-sonnet-4-5", "claude-haiku-4-5", "gemini-2.5-pro", "gemini-2.5-flash"
}
```

Three tools provide analytics:

| Tool                     | What it does                                                              |
| ------------------------ | ------------------------------------------------------------------------- |
| `aidd_model_performance` | Metrics for a specific model: compliance scores, reverts, test pass rates |
| `aidd_model_compare`     | Side-by-side comparison of 2+ models across quality, compliance, reverts  |
| `aidd_model_recommend`   | Given a task type, recommend the best model from historical data          |

This data is **real-world benchmarking** — not synthetic tests, but actual development session outcomes.

---

## Evolution Engine

The autonomous evolution engine learns from every completed session and improves the AIDD framework without user intervention.

### How It Works

1. **Instrumentation** — Every session records detailed metadata
2. **Pattern recognition** — Engine identifies what leads to better outcomes
3. **Confidence-based auto-apply**:
   - **>90% confidence, 10+ sessions**: Auto-apply, notify user
   - **70-90% confidence, 5-10 sessions**: Create draft in `.aidd/drafts/`
   - **<70% confidence, <5 sessions**: Store as pending candidate in SQLite

### What It Evolves

| Observation                        | Auto-Improvement             |
| ---------------------------------- | ---------------------------- |
| Agent X better for task type Y     | Update routing weights       |
| Skill combo A+B > A alone          | Update agent skill sets      |
| Rule violation always reverted     | Elevate rule severity        |
| Tools X→Y→Z always together        | Create compound workflow     |
| Recurring mistake pattern          | Draft new rule/convention    |
| Model A outperforms B for frontend | Update model recommendations |

### Safeguards

- All changes logged in evolution_log table (audit trail)
- Framework snapshots in evolution_snapshots table (rollback)
- Configurable thresholds in `.aidd/config.json`
- Kill switch: `"evolution": { "kill_switch": true }`
- Learning period: first N sessions = data collection only

---

## Content Loading

### Bundled Content (build time)

AIDD framework content ships inside the npm packages:
- AGENTS.md, specs/, rules/, skills/, workflows/, templates/, knowledge/

### Project Detection (runtime)

The MCP scans for a `.aidd/` directory with AIDD content:
1. `.aidd/content/agents/` — agent definitions directory
2. `.aidd/content/rules/` — rule files
3. `.aidd/content/skills/`, `workflows/`, `specs/`, `knowledge/`, `templates/`
4. `.aidd/memory/` — permanent memory (decisions, mistakes, conventions)
5. Stack detection: `package.json`

### Merge Strategy

| Content   | Behavior                                          |
| --------- | ------------------------------------------------- |
| AGENTS.md | Project wins entirely (SSOT)                      |
| Rules     | Project overrides by filename, additions included |
| Skills    | Project overrides by agent name                   |
| Workflows | Project overrides by filename                     |
| Templates | Project overrides by filename                     |
| Knowledge | Merged by path, project entries override bundled  |
| Memory    | Project-only (never from bundled)                 |
| Specs     | Bundled-only (specs define the standard)          |

---

## Configuration

### Environment Variables

| Variable                     | Values                                  | Default           |
| ---------------------------- | --------------------------------------- | ----------------- |
| `AIDD_TRANSPORT`             | `stdio`, `streamable-http`              | `stdio`           |
| `AIDD_PROJECT_PATH`          | Path to project                         | Current directory |
| `AIDD_PORT`                  | Port number                             | `3100`            |
| `AIDD_LOG_LEVEL`             | `debug`, `info`, `warn`, `error`        | `info`            |
| `AIDD_CONTENT_OVERRIDE_MODE` | `merge`, `project_only`, `bundled_only` | `merge`           |
| `AIDD_EVOLUTION_ENABLED`     | `true`, `false`                         | `true`            |
| `AIDD_EVOLUTION_THRESHOLD`   | `0-100`                                 | `90`              |
| `AIDD_MODE`                  | `engine`, `core`, `memory`, `tools`     | `engine`          |

### Project Config (`.aidd/config.json`)

```json
{
  "evolution": {
    "enabled": true,
    "auto_apply_threshold": 90,
    "draft_threshold": 70,
    "learning_period_sessions": 5,
    "kill_switch": false
  },
  "memory": {
    "max_session_history": 100,
    "auto_promote_branch_decisions": true,
    "prune_after_days": 90
  },
  "model_tracking": {
    "enabled": true,
    "cross_project": false
  },
  "ci": {
    "block_on": ["security_critical", "type_safety"],
    "warn_on": ["code_style", "documentation"],
    "ignore": ["commit_format"]
  },
  "content": {
    "override_mode": "merge"
  }
}
```

### Client Configurations

**Engine (recommended)** — Claude Code, Cursor, Windsurf:
```json
{
  "mcpServers": {
    "aidd-engine": {
      "command": "npx",
      "args": ["@aidd.md/mcp-engine"],
      "env": { "AIDD_PROJECT_PATH": "${workspaceFolder}" }
    }
  }
}
```

**Split mode** — for granular control:
```json
{
  "mcpServers": {
    "aidd-core": {
      "command": "npx",
      "args": ["@aidd.md/mcp-core"],
      "env": { "AIDD_PROJECT_PATH": "${workspaceFolder}" }
    },
    "aidd-memory": {
      "command": "npx",
      "args": ["@aidd.md/mcp-memory"],
      "env": { "AIDD_PROJECT_PATH": "${workspaceFolder}" }
    },
    "aidd-tools": {
      "command": "npx",
      "args": ["@aidd.md/mcp-tools"],
      "env": { "AIDD_PROJECT_PATH": "${workspaceFolder}" }
    }
  }
}
```

---

## Package Structure

All MCP packages follow the same structure:

```
mcps/<package>/
├── src/
│   ├── index.ts          # Entrypoint + transport selection
│   ├── server.ts         # Server creation + module registration
│   ├── modules/
│   │   ├── index.ts      # Export all modules
│   │   └── <module>/     # Individual modules
│   │       ├── index.ts  # Module definition (implements AiddModule)
│   │       └── tools/    # Tool implementations
│   └── transport/
│       ├── stdio.ts      # stdin/stdout transport
│       └── http.ts       # Streamable HTTP transport
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── __tests__/
```

Each module implements the `AiddModule` interface:

```typescript
interface AiddModule {
  readonly name: string;
  readonly description: string;
  register(server: McpServer, context: ModuleContext): void;
  onReady?(context: ModuleContext): Promise<void>;
}
```

---

## Adding a New Tool

1. Create the tool file in the appropriate module:

   ```typescript
   // mcps/mcp-aidd-core/src/modules/knowledge/tools/my-tool.ts
   import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
   import type { z } from 'zod';
   import { createTextResult } from '@aidd.md/mcp-shared';

   export function registerMyTool(server: McpServer, zod: typeof z) {
     server.tool(
       'aidd_my_tool',
       'Description of what this tool does',
       {
         param: zod.string().describe('What this parameter is'),
       },
       async ({ param }) => {
         // Tool logic here
         return createTextResult('result');
       },
     );
   }
   ```

2. Register it in the module's `index.ts`
3. Rebuild: `pnpm mcp:build`

---

## CI/CD Integration

The Tools MCP doubles as a CI tool:

```bash
# PR comments (GitHub Actions)
npx @aidd.md/mcp-tools ci --report=github

# Machine-readable
npx @aidd.md/mcp-tools ci --report=json

# Human-readable
npx @aidd.md/mcp-tools ci --report=markdown
```

### GitHub Actions Example

```yaml
name: AIDD Compliance
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npx @aidd.md/mcp-tools ci --report=github
```

### Configurable Severity

In `.aidd/config.json`:
```json
{
  "ci": {
    "block_on": ["security_critical", "type_safety"],
    "warn_on": ["code_style", "documentation"],
    "ignore": ["commit_format"]
  }
}
```

---

## Troubleshooting

### "MCP server not found" or tool not available

```bash
pnpm mcp:build
```

### MCPs built but AI tool doesn't detect them

1. Verify your AI tool's MCP configuration file points to the correct command
2. Restart the AI tool (Claude Code, Cursor, etc.)

### Quick status check

```bash
pnpm mcp:status
```

```
[aidd.md] Status

  ✅ @aidd.md/mcp-shared    ready
  ✅ @aidd.md/mcp-engine    ready
  ✅ @aidd.md/mcp-core      ready
  ❌ @aidd.md/mcp-memory    not built
  ✅ @aidd.md/mcp-tools     ready

[aidd.md] 4/5 packages ready → Run: pnpm mcp:build
```

### Full diagnostic

```bash
pnpm mcp:doctor
```

Reports the state of each component with section timing and suggests corrective actions:

```
[aidd.md] Doctor
  Environment → Dependencies → aidd.md MCPs → MCPs installed → aidd.md Framework →
  Skills Validation → Cross-References → Model Matrix → Project State (.aidd/) → Installed Agents

Environment — Node.js, pnpm
  ✅ Node.js v22.x
  ✅ pnpm 10.x

Dependencies — Lockfile and node_modules
  ✅ node_modules/ exists
  ✅ pnpm-lock.yaml up to date

aidd.md MCPs — Package build status
  ✅ @aidd.md/mcp-shared built
  ✅ @aidd.md/mcp-engine built
  ✅ @aidd.md/mcp-core built
  ✅ @aidd.md/mcp-memory built
  ✅ @aidd.md/mcp-tools built
  ✅ 5/5 packages built
  ✅ @modelcontextprotocol/sdk 1.x

MCPs installed — External MCP servers
  ✅ context7 [cursor] — running
  ℹ  shadcn [cursor] — not running

aidd.md Framework — Content and structure
  ✅ AGENTS.md found
  ✅ rules/ (11 files)
  ✅ skills/ (11 agents)
  ✅ knowledge/ (9 domains, 106 entries)
  ✅ workflows/ (9 files + 5 orchestrators)
  ✅ specs/ (6 files)
  ✅ templates/ (23 files)

Skills Validation — Frontmatter integrity
  ✅ 11/11 skills have valid frontmatter

Cross-References — AGENTS.md ↔ skills/
  ✅ AGENTS.md → skills/ (11 refs, all valid)

Model Matrix — SSOT sync and freshness
  ✅ model-matrix.md ↔ model-matrix.ts in sync (16 models)

Project State (.aidd/) — Config, sessions, storage
  ✅ .aidd/ directory found
  ✅ config.json valid (all sections present)
  ✅ sessions/ exists

Installed Agents — Detected AI editors/CLIs
  ✅ Claude Code (CLI)
  ✅ Cursor (IDE)

[aidd.md] All checks passed! (952ms)
```

#### Doctor flags

| Flag           | Description                                                      |
| -------------- | ---------------------------------------------------------------- |
| `--json`       | Output structured JSON (for CI/scripting)                        |
| `--fix`        | Auto-fix common issues (rebuild stale packages, create `.aidd/`) |
| `--deep`       | Run slow checks (TypeScript type checking)                       |
| `--quiet`      | Only show failures and warnings                                  |
| `--no-runtime` | Skip process detection (faster)                                  |
| `--no-color`   | Disable ANSI colors (also respects `NO_COLOR` env)               |

#### Exit codes

| Code | Meaning                                                  |
| ---- | -------------------------------------------------------- |
| `0`  | All checks passed                                        |
| `1`  | Warnings only (everything works, optional setup pending) |
| `2`  | Errors detected (action required)                        |

### Single-line check (for AI startup)

```bash
pnpm mcp:check
```

```
[aidd.md] Engine - ON — 5/5 packages ready
```

Use this in CLAUDE.md startup protocol or similar automation.

---

## Resources (MCP Protocol)

| URI Pattern                           | Description               |
| ------------------------------------- | ------------------------- |
| `aidd://agents`                       | AGENTS.md (SSOT)          |
| `aidd://specs/{name}`                 | Spec documents            |
| `aidd://rules/{name}`                 | Individual rules          |
| `aidd://skills/{agent}`               | Skill definitions         |
| `aidd://workflows/{name}`             | Workflow procedures       |
| `aidd://templates/{name}`             | Task templates            |
| `aidd://knowledge/{category}/{entry}` | TKB entries               |
| `aidd://memory/decisions`             | Project decisions         |
| `aidd://memory/mistakes`              | Project mistakes          |
| `aidd://memory/conventions`           | Project conventions       |
| `aidd://evolution/status`             | Evolution engine state    |
| `aidd://models/analytics`             | AI model performance data |
| `aidd://enforcement/guardrails`       | All guardrails from rules |

## Prompts (MCP Protocol)

| Prompt                   | Description                                  |
| ------------------------ | -------------------------------------------- |
| `aidd_plan_task`         | Plan using AIDD orchestrator + BLUF-6 format |
| `aidd_select_technology` | TKB-driven technology comparison             |
| `aidd_review_code`       | Rule-based code review                       |
| `aidd_start_feature`     | Full AIDD 6-phase lifecycle guide            |
| `aidd_security_audit`    | OWASP-based security audit                   |
