<p align="center">
  <img src="logo.svg" alt="aidd.md logo" width="240" height="78">
</p>

# aidd.md — AI-Driven Development

> The open standard for AI-Driven Development. Multi-IDE, AI-agnostic agent coordination.

**Version**: 1.0.0
**Last Updated**: 2026-02-07
**License**: MIT
**Domain**: https://aidd.md

---

## What is AIDD?

**AIDD** is an open standard for structuring AI-assisted development. It provides a modular, composable framework of agent roles, rules, skills, workflows, templates, and specifications — all under `.aidd/content/` in your project — that any AI system can consume, enabling consistent, evidence-based development across IDEs and providers.

**Core principles**: Evidence-First engineering, First Principles thinking, BLUF-6 communication, Zero Trust verification, Lean Antifragility.

**Key benefits**:
- Multi-IDE compatible (Claude Code, Cursor, VS Code, Gemini, Windsurf)
- AI-agnostic (works with Claude, Gemini, ChatGPT, local models)
- Modular and composable (load only what you need)
- Evidence-based (every decision traceable to data or principles)
- Progressive disclosure (token-efficient context loading)

## How to follow the methodology?
If you want to take 100% advantage of AIDD make sure to read [WORKFLOW.MD](./WORKFLOW.md)

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

See `content/specs/aidd-lifecycle.md` for full details.

---

## Directory Structure

```
aidd.md/
├── AGENTS.md                    # Single Source of Truth
├── README.md                    # This file
├── LICENSE                      # MIT
├── CONTRIBUTING.md              # Contribution guidelines
├── CHANGELOG.md                 # Version history
├── package.json                 # Validation script dependencies
│
├── content/                     # Framework content
│   ├── specs/                   # Formal specifications (6)
│   │   ├── aidd-lifecycle.md
│   │   ├── bluf-6.md
│   │   ├── heuristics.md
│   │   ├── version-protocol.md
│   │   ├── memory-layer.md
│   │   └── model-matrix.md
│   │
│   ├── rules/                   # Immutable constraints (12)
│   │   ├── global.md
│   │   ├── orchestrator.md
│   │   ├── backend.md
│   │   ├── frontend.md
│   │   ├── testing.md
│   │   ├── security.md
│   │   ├── interfaces.md
│   │   ├── code-style.md
│   │   ├── git-workflow.md
│   │   ├── documentation.md
│   │   └── performance.md
│   │
│   ├── skills/                  # Agent capabilities (11)
│   ├── workflows/               # Multi-step procedures (12)
│   ├── knowledge/               # Technology Knowledge Base (106 entries)
│   └── templates/               # Protocol templates (5) with routing
│
├── adapters/                    # IDE/AI integration guides
│   ├── claude/
│   ├── cursor/
│   ├── gemini/
│   ├── vscode/
│   └── windsurf/
│
├── examples/                    # Project setup examples
│   ├── minimal/
│   └── full/
│
├── scripts/                     # Validation scripts
└── website/                     # Future: https://aidd.md
```

---

## IDE Integration

`pnpm setup` auto-detects and configures all supported IDEs:

| IDE         | Detection                     | Config Files                                             | How It Works                              |
| ----------- | ----------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| Claude Code | `~/.claude/` exists           | `~/.claude.json` + `.mcp.json`                           | MCP engine via user scope + project scope |
| Cursor      | Always available              | `.cursor/mcp.json` + `.cursor/rules/aidd.mdc`            | MCP engine + rules pointer                |
| VS Code     | `.vscode/` or `code` CLI      | `.vscode/mcp.json` + `.github/copilot-instructions.md`   | MCP engine via Copilot                    |
| Gemini      | `AGENTS.md` exists            | `.gemini/settings.json`                                  | Reads AGENTS.md directly (no MCP needed)  |
| Windsurf    | `~/.codeium/windsurf/` exists | `~/.codeium/windsurf/mcp_config.json` + `.windsurfrules` | MCP engine + rules pointer                |

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
