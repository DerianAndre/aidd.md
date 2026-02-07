<p align="center">
  <img src="logo.svg" alt="aidd.md logo" width="240" height="78">
</p>

# aidd.md — AI-Driven Development

> The open standard for AI-Driven Development. Multi-IDE, AI-agnostic agent coordination.

**Version**: 1.0.0
**Last Updated**: 2026-02-05
**License**: MIT
**Domain**: https://aidd.md

---

## What is AIDD?

**AIDD** is an open standard for structuring AI-assisted development. It provides a modular, composable framework of agent roles, rules, skills, workflows, templates, and specifications — all under the `content/` directory — that any AI system can consume, enabling consistent, evidence-based development across IDEs and providers.

**Core principles**: Evidence-First engineering, First Principles thinking, BLUF-6 communication, Zero Trust verification, Lean Antifragility.

**Key benefits**:
- Multi-IDE compatible (Antigravity, Cursor, Claude Code, Warp)
- AI-agnostic (works with Claude, Gemini, ChatGPT, local models)
- Modular and composable (load only what you need)
- Evidence-based (every decision traceable to data or principles)
- Progressive disclosure (token-efficient context loading)

---

## Quick Start

### 1. Copy AIDD into your project

```bash
# Clone or copy the AIDD structure into your project
cp -r aidd.md/.agentic/ your-project/.agentic/
# Or use AGENTS.md at project root
cp aidd.md/AGENTS.md your-project/AGENTS.md
```

### 2. Activate the agent system

Use this prompt with any AI:

```
Read AGENTS.md and assume the most appropriate role for my task.

IMPERATIVES:
1. Respect ALL rules in content/rules/global.md
2. Load domain-specific rules as needed
3. Use skills from content/skills/ directories
4. Follow workflows in content/workflows/ for multi-step tasks

Confirm your role and loaded rules before proceeding.
```

### 3. Install validation scripts (optional)

```bash
npm install
npm run validate:mermaid "C4Context..."
npm run validate:openapi spec.yaml
npm run validate:sql schema.sql
npm run scan:secrets src/config.ts
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

### Rules (10 files)

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

### Specifications (5 files)

Formal reference documents — descriptive, detailed rationale. Located in `content/specs/`:

| Specs                 | Content                                                     |
| --------------------- | ----------------------------------------------------------- |
| `aidd-lifecycle.md`   | 6-phase AI-Driven Development lifecycle                     |
| `bluf-6.md`           | 6-part communication protocol                               |
| `heuristics.md`       | 10 decision heuristics with examples                        |
| `version-protocol.md` | 4-step version verification                                 |
| `memory-layer.md`     | Project memory integration (decisions/mistakes/conventions) |

### Skills (11 directories)

Specialized capabilities with optional validation scripts. Located in `content/skills/`. Each skill has a `SKILL.md` with YAML frontmatter defining name, description, and recommended model tier.

### Workflows (9 + 3 orchestrators)

Multi-step procedures located in `content/workflows/`: analyze, audit, design, docs, feature-branch, product, review, technology-selection, test. Orchestrators: full-stack-feature. Complex workflows: analyze (security + audit), docs (documentation sync).

### Templates (5 files)

Standalone protocol templates located in `content/templates/`. Domain-specific content has been absorbed into `content/rules/`, `content/skills/`, and `content/workflows/`. See `content/templates/routing.md` for the full routing table.

| Template               | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| brainstorming.md       | Diverge → Analyze → Converge → Document protocol      |
| research.md            | Multi-source investigation and synthesis               |
| penetration-testing.md | Authorized offensive security testing                  |
| migration.md           | Version upgrades and breaking change management        |
| routing.md             | Task-to-template/rule/skill/workflow routing (SSOT)    |

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
│   └── warp/
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

| IDE         | Setup                                | Details                |
| ----------- | ------------------------------------ | ---------------------- |
| Antigravity | Auto-loads AGENTS.md natively        | See `adapters/gemini/` |
| Cursor      | Symlink `.cursor/rules` → `content/rules/` | See `adapters/cursor/` |
| Claude Code | Auto-discovers skills from `content/skills/` | See `adapters/claude/` |
| Warp        | WARP.md guidance file                | See `adapters/warp/`   |

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
