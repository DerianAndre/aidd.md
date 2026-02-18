<p align="center">
  <img src="logo.svg" alt="aidd.md logo" width="240" height="78">
</p>

# aidd.md — AI-Driven Development

> The open standard for AI-Driven Development. Multi-IDE, AI-agnostic agent coordination.

**Version**: 1.0.0
**Last Updated**: 2026-02-08
**License**: MIT
**Domain**: https://aidd.md

---

## What is AIDD?

**AIDD** is an open standard for structuring AI-assisted development. It provides a modular, composable framework of agent roles, rules, skills, workflows, templates, and specifications — all under `.aidd/content/` in your project — that any AI system can consume, enabling consistent, evidence-based development across IDEs and providers.

**Core principles**: Evidence-First engineering, First Principles thinking, BLUF-6 communication, Zero Trust verification, Lean Antifragility.

**Key benefits**:
- Multi-IDE compatible (Claude Code, Cursor, Gemini, Warp)
- AI-agnostic (works with Claude, Gemini, ChatGPT, local models)
- Modular and composable (load only what you need)
- Evidence-based (every decision traceable to data or principles)
- Progressive disclosure (token-efficient context loading)
- Self-improving (session memory, pattern detection, framework evolution)

## How to Follow the Methodology

Read [WORKFLOW.md](./WORKFLOW.md) for the full user guide — core concepts, conversation lifecycle, automatic vs manual operations, and tips for getting best results.

## Quick Start

### Contributors (clone the repo)

```bash
git clone https://github.com/DerianAndre/aidd.md.git
cd aidd.md
pnpm install
pnpm setup          # builds, detects IDEs, configures, verifies
# Open your IDE — MCPs auto-start
```

### Adopters (use in your project)

**Option A — CLI (recommended):**

```bash
cd my-project
npx @aidd.md/cli init    # copies framework, sets up .aidd/, integrates IDEs
# Open your IDE — MCPs auto-start
```

**Option B — Manual:**

```bash
# Copy the AIDD framework into your project
mkdir -p your-project/.aidd/content
cp -r aidd.md/content/ your-project/.aidd/content/
# Create thin AGENTS.md redirect at root (for Gemini compat)
echo "See [.aidd/content/agents/](.aidd/content/agents/) for agent definitions." > your-project/AGENTS.md
```

### Activate the agent system

Use this prompt with any AI:

```
Read .aidd/content/agents/routing.md and assume the most appropriate role for my task.

IMPERATIVES:
1. Respect ALL rules in .aidd/content/rules/global.md
2. Load domain-specific rules as needed
3. Use skills from .aidd/content/skills/ directories
4. Follow workflows in .aidd/content/workflows/ for multi-step tasks

Confirm your role and loaded rules before proceeding.
```

---

## Core Concepts

### Agent System

11 specialized roles coordinated by the Master Orchestrator:

| Agent               | Purpose                                 | Activation                      |
| ------------------- | --------------------------------------- | ------------------------------- |
| Master Orchestrator | Logic orchestration, context validation | Entry-point for any task        |
| System Architect    | C4 diagrams, ADRs, system design        | "architecture", "system design" |
| Contract Architect  | OpenAPI 3.1, API governance             | "API design", "OpenAPI"         |
| Data Architect      | SQL schemas, data strategy              | "database", "schema"            |
| Interface Artisan   | React components, WCAG, Tailwind        | "component", "UI"               |
| Experience Engineer | Frontend architecture, performance      | "state management", "optimize"  |
| Design Architect    | Design systems, tokens                  | "design system", "tokens"       |
| Security Architect  | OWASP audits, defense-in-depth          | "security", "vulnerabilities"   |
| Quality Engineer    | Test generation, quality strategy       | "write tests", "coverage"       |
| Platform Engineer   | CI/CD, Docker, monitoring               | "deploy", "infrastructure"      |
| Knowledge Architect | Documentation sync                      | "update docs", "document"       |
| i18n Specialist     | Internationalization                    | "i18n", "translate"             |

### Rules (11 files)

Immutable constraints — prescriptive, MUST follow. Located in `content/rules/`:

| Rule               | Scope                                                        |
| ------------------ | ------------------------------------------------------------ |
| `global.md`        | Evidence-First, BLUF-6, heuristics, immutability constraints |
| `orchestrator.md`  | Task decomposition, strategic mapping, TKB integration       |
| `backend.md`       | Hexagonal architecture, API design, security patterns        |
| `frontend.md`      | WCAG 2.1 AA, React patterns, Tailwind best practices         |
| `testing.md`       | Test pyramid (70/20/10), AAA pattern, coverage targets       |
| `security.md`      | OWASP Top 10 (2025), secret management, CI/CD security       |
| `interfaces.md`    | Zero-fidelity contracts between agents                       |
| `code-style.md`    | Naming conventions, TypeScript strict, import patterns       |
| `git-workflow.md`  | Commit format, branch strategy, spec-first flow              |
| `documentation.md` | Normalized patterns, folder structure, ADR format            |
| `performance.md`   | Performance budgets, optimization patterns                   |

### Specifications (8 files)

Formal reference documents — descriptive, detailed rationale. Located in `content/specs/`:

| Specs                 | Content                                                     |
| --------------------- | ----------------------------------------------------------- |
| `aidd-lifecycle.md`   | 6-phase AI-Driven Development lifecycle                     |
| `bluf-6.md`           | 6-part communication protocol                               |
| `heuristics.md`       | 10 decision heuristics with examples                        |
| `version-protocol.md` | 4-step version verification                                 |
| `memory-layer.md`     | Project memory integration (decisions/mistakes/conventions) |
| `supported-agents.md` | Agent registry and role definitions                         |
| `model-matrix.md`     | Multi-provider model routing matrix                         |
| `prompt-evolution.md` | Prompt evolution and optimization patterns                  |

### Skills (11 directories)

Specialized capabilities with optional validation scripts. Located in `content/skills/`. Each skill has a `SKILL.md` with YAML frontmatter defining name, description, and recommended model tier.

### Workflows (11 files)

Multi-step procedures located in `content/workflows/`: orchestrator, analyze, audit, design, docs, feature-branch, full-stack-feature, product, review, technology-selection, test. The orchestrator is THE single entry point for all tasks.

### Templates (5 files)

Standalone protocol templates located in `content/templates/`. Domain-specific content has been absorbed into `content/rules/`, `content/skills/`, and `content/workflows/`. See `content/templates/routing.md` for the full routing table.

| Template               | Purpose                                             |
| ---------------------- | --------------------------------------------------- |
| brainstorming.md       | Diverge → Analyze → Converge → Document protocol    |
| research.md            | Multi-source investigation and synthesis            |
| penetration-testing.md | Authorized offensive security testing               |
| migration.md           | Version upgrades and breaking change management     |
| routing.md             | Task-to-template/rule/skill/workflow routing (SSOT) |

### Knowledge Base (106 entries)

Quantified technology metrics across 13 categories located in `content/knowledge/`: runtimes, frontend, backend, data, testing, infrastructure, security, tooling, patterns. The Master Orchestrator queries the TKB for evidence-based technology recommendations.

---

## AIDD Lifecycle

AI-Driven Development — the recommended development workflow:

```
PLANNING (Tier 1)              EXECUTION (Tier 2)         CLOSURE (Tier 3)
──────────────────             ──────────────────         ────────────────
1. UNDERSTAND (context+reqs)   4. BUILD (implement)       6. SHIP (commit+PR)
2. PLAN (atomic tasks)         5. VERIFY (test+check)
3. SPEC (persist spec)
```

See `content/specs/aidd-lifecycle.md` for full details and [WORKFLOW.md](./WORKFLOW.md) for the user guide.

---

## MCP Ecosystem

The AIDD MCP engine exposes **82 tools** across 5 packages for full session tracking, memory persistence, validation, and self-improvement:

```
packages/
  shared/           @aidd.md/mcp-shared    (types, utils, server factory)
  cli/              @aidd.md/cli           (CLI — framework management)

mcps/
  mcp-aidd-engine/  @aidd.md/mcp-engine    (engine — all modules in one process)
  mcp-aidd-core/    @aidd.md/mcp-core      (brain — guidance, routing, knowledge)
  mcp-aidd-memory/  @aidd.md/mcp-memory    (memory — sessions, evolution, analytics)
  mcp-aidd-tools/   @aidd.md/mcp-tools     (hands — validation, enforcement, CI)
```

| Category | Tools | Purpose |
|----------|-------|---------|
| Project + Guidance | 6 | Bootstrap, task routing, heuristic analysis |
| Knowledge + Agents | 5 | TKB queries, tech compatibility, agent skills |
| Sessions + Memory | 15 | Session lifecycle, observations, permanent memory |
| Lifecycle + Evolution | 8 | Phase tracking, self-improvement candidates |
| Analytics + Patterns | 9 | Model performance, output quality, fingerprinting |
| Validation + CI | 18 | Code quality, compliance, commit generation |
| Drafts + Artifacts | 4 | Content drafts, workflow documents |
| Context + Health | 6 | Context optimization, diagnostics, scaffolding |

See [mcps/README.md](mcps/README.md) for full architecture and [mcps/PLAN.md](mcps/PLAN.md) for implementation roadmap.

---

## Directory Structure

```
aidd.md/
├── AGENTS.md                    # Thin redirect to content/agents/ (Gemini compat)
├── CLAUDE.md                    # Claude Code conversation lifecycle protocol
├── WORKFLOW.md                  # User-facing methodology guide
├── README.md                    # This file
├── LICENSE                      # MIT
├── CONTRIBUTING.md              # Contribution guidelines
├── package.json                 # Monorepo root
├── pnpm-workspace.yaml          # Workspace config
│
├── content/                     # Framework content (SSOT)
│   ├── agents/                  # Agent definitions + routing
│   ├── specs/                   # Formal specifications (8)
│   ├── rules/                   # Immutable constraints (11)
│   ├── skills/                  # Agent capabilities (11)
│   ├── workflows/               # Multi-step procedures (11)
│   ├── knowledge/               # Technology Knowledge Base (106 entries)
│   └── templates/               # Protocol templates (5) with routing
│
├── adapters/                    # IDE/AI integration guides
│   ├── README.md                # Adapter comparison and overview
│   ├── claude/                  # Claude Code (full: context + hooks + MCP)
│   ├── cursor/                  # Cursor (context + MCP)
│   ├── gemini/                  # Gemini/Antigravity (context + MCP + API)
│   └── warp/                    # Warp (context only)
│
├── packages/                    # Shared libraries and CLI
│   ├── shared/                  # @aidd.md/mcp-shared
│   └── cli/                     # @aidd.md/cli
│
├── mcps/                        # MCP server packages
│   ├── mcp-aidd-engine/         # @aidd.md/mcp-engine (all-in-one)
│   ├── mcp-aidd-core/           # @aidd.md/mcp-core (guidance)
│   ├── mcp-aidd-memory/         # @aidd.md/mcp-memory (sessions)
│   └── mcp-aidd-tools/          # @aidd.md/mcp-tools (validation)
│
├── apps/                        # Applications
│   └── hub/                     # AIDD Hub (Tauri 2 + React 19)
│
├── examples/                    # Project setup examples
│   ├── minimal/                 # Minimal AIDD setup
│   └── full/                    # Full AIDD setup with memory
│
├── docs/                        # Documentation
├── scripts/                     # Build and setup scripts
└── .claude/                     # Claude Code configuration
    ├── settings.json            # Permissions, hooks, status line
    └── statusline.js            # Cross-platform status bar script
```

---

## IDE Integration

AIDD integrates with AI-powered development tools through three layers: **Context** (file-based), **Protocol** (conversation lifecycle), and **MCP** (82 tools). See [adapters/README.md](adapters/README.md) for the full comparison.

`pnpm setup` auto-detects and configures all supported IDEs:

| IDE         | Detection                     | Integration Layers              | Adapter Guide                       |
| ----------- | ----------------------------- | ------------------------------- | ----------------------------------- |
| Claude Code | `~/.claude/` exists           | Context + Protocol + MCP        | [adapters/claude/](adapters/claude/) |
| Cursor      | Always available              | Context + MCP                   | [adapters/cursor/](adapters/cursor/) |
| Gemini      | `AGENTS.md` exists            | Context + MCP + API             | [adapters/gemini/](adapters/gemini/) |
| Warp        | Manual setup                  | Context only                    | [adapters/warp/](adapters/warp/)     |

Run `pnpm mcp:doctor` to verify IDE integration status.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on adding rules, skills, workflows, templates, and knowledge base entries.

---

## License

MIT License — See [LICENSE](./LICENSE).

---

## Acknowledgments

- [Antigravity Documentation](https://antigravity.google/docs)
- [Anthropic Skills Specification](https://github.com/anthropics/skills)
