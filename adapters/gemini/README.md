# Gemini Adapter

> AIDD integration guide for Gemini (Antigravity / Google AI Studio)

**Last Updated**: 2026-02-18
**Status**: Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Setup](#2-setup)
3. [Native AGENTS.md Support](#3-native-agentsmd-support)
4. [Content Directory Convention](#4-content-directory-convention)
5. [MCP Integration](#5-mcp-integration)
6. [System Prompt Integration](#6-system-prompt-integration)
7. [Memory Layer](#7-memory-layer)
8. [Conversation Lifecycle](#8-conversation-lifecycle)

---

## 1. Overview

Gemini integrates with AIDD through up to three layers depending on the environment:

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| **Context** | `AGENTS.md` auto-load (Antigravity) | Agent roles, rules, knowledge — zero config |
| **MCP** | `@aidd.md/mcp-engine` | 82 tools for sessions, memory, validation, evolution |
| **API** | System prompt injection | AIDD context in direct Gemini API calls |

Antigravity natively auto-loads `AGENTS.md`, making AIDD integration zero-configuration for Gemini-powered development environments.

---

## 2. Setup

### Antigravity (Zero Config)

No setup required. Antigravity detects and loads `AGENTS.md` from the project root automatically.

### With MCP Server

```bash
# Build AIDD MCP server
pnpm setup

# Verify
pnpm mcp:check
# Expected: [aidd.md] Engine - ON — 5/5 packages ready
```

Configure the MCP server in your Gemini-compatible environment:

```json
{
  "aidd-engine": {
    "command": "node",
    "args": ["path/to/mcps/mcp-aidd-engine/dist/index.js"],
    "env": {
      "AIDD_PROJECT_ROOT": "/path/to/project"
    }
  }
}
```

### Google AI Studio

Use system prompt injection (see [Section 6](#6-system-prompt-integration)).

---

## 3. Native AGENTS.md Support

Antigravity detects and loads `AGENTS.md` automatically. The file serves as the single source of truth for:

- Agent hierarchy (`content/routing.md` as canonical reference)
- Rules (`content/rules/global.md` as supreme constraint)
- Skill discovery (`content/skills/<name>/SKILL.md`)
- Workflow procedures (`content/workflows/`)

The root `AGENTS.md` is a thin redirect to `content/routing.md` for Gemini compatibility. This ensures Gemini reads the same agent definitions as all other tools.

---

## 4. Content Directory Convention

Gemini reads the `content/` directory for AIDD framework files:

```
content/
  agents/      → Agent definitions and routing
  rules/       → Domain-specific rules (global, frontend, backend, etc.)
  skills/      → Specialized agent capabilities with SKILL.md
  workflows/   → Step-by-step procedures for multi-agent tasks
  specs/       → AIDD standard specifications
  knowledge/   → Technology Knowledge Base (TKB) entries
  templates/   → Task routing and decision templates
```

When `content/` is present alongside `AGENTS.md`, Gemini reads its contents for complete AIDD context.

---

## 5. MCP Integration

When the MCP server is configured in a Gemini-compatible environment, all 82 AIDD tools become available. The critical path:

| Tool | When | Purpose |
|------|------|---------|
| `aidd_start` | Conversation start | Initialize session, load framework context |
| `aidd_session { update }` | During work | Track progress, decisions, errors |
| `aidd_session { end }` | Conversation end | Close session with outcome metrics |
| `aidd_memory_search` | Before planning | Check for prior decisions, mistakes, conventions |
| `aidd_diagnose_error` | On errors | Look up known fixes from memory |
| `aidd_observation` | On learnings | Record significant discoveries |

### Additional Tools

| Category | Tools | Purpose |
|----------|-------|---------|
| Validation | `aidd_validate_*`, `aidd_audit_*` | Code quality checks |
| Pre-commit | `aidd_generate_commit_message`, `aidd_ci_diff_check` | Change validation |
| Knowledge | `aidd_query_tkb`, `aidd_tech_compatibility` | Technology research |
| Evolution | `aidd_evolution_analyze/status/review` | Self-improvement |

---

## 6. System Prompt Integration

For direct Gemini API usage (Google AI Studio, Vertex AI, custom apps), inject AIDD context as a system instruction:

1. Read `AGENTS.md` content at runtime
2. Prepend as a system instruction in the Gemini API request
3. Include `content/rules/global.md` content as immutable constraints
4. Append domain-specific rules based on the task context

```javascript
import { GoogleGenAI } from '@google/genai';

const agents = fs.readFileSync('AGENTS.md', 'utf-8');
const globalRules = fs.readFileSync('content/rules/global.md', 'utf-8');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const response = await ai.models.generateContent({
  model: 'gemini-2.5-pro',
  systemInstruction: `${agents}\n\n---\n\n${globalRules}`,
  contents: userMessage,
});
```

This ensures API-level Gemini calls follow the same AIDD standards as IDE-integrated workflows.

---

## 7. Memory Layer

When MCP is available, Gemini has access to the full 3-layer memory system:

| Layer | Tools | Persistence |
|-------|-------|-------------|
| Observations | `aidd_observation` | Session-scoped, FTS indexed |
| Permanent | `aidd_memory_add_decision/mistake/convention` | Cross-session, SQLite |
| Exported | `aidd_memory_export` | `.aidd/memory/*.json`, Git-visible |

Without MCP, memory files in `.aidd/memory/` (exported JSON) can be read directly for prior context.

---

## 8. Conversation Lifecycle

### With MCP

```
1. aidd_start                      → Initialize session
2. aidd_memory_search              → Check prior context (before planning)
3. [Work phase]
   └─ aidd_session { update }      → Track at task boundaries
   └─ aidd_observation             → Record significant learnings
   └─ aidd_diagnose_error          → Look up known fixes on errors
4. aidd_generate_commit_message    → Pre-commit validation
   └─ aidd_ci_diff_check           → Validate changed files
5. aidd_session { end }            → Close with outcome metrics
```

### Without MCP (Context Only)

Gemini operates using `AGENTS.md` and `content/` for context. No session tracking or memory persistence. The AI follows rules and agent definitions but cannot record learnings across sessions.

---

## Cross-References

- **Adapters Overview**: `adapters/README.md`
- **AIDD Lifecycle**: `content/specs/aidd-lifecycle.md`
- **Memory Layer**: `content/specs/memory-layer.md`
- **MCP Architecture**: `mcps/README.md`
