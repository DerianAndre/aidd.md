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

**AIDD** is an open standard for structuring AI-assisted development. It provides a modular, composable framework of agent roles, rules, skills, workflows, templates, and specifications that any AI system can consume — enabling consistent, evidence-based development across IDEs and providers.

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
1. Respect ALL rules in rules/global.md
2. Load domain-specific rules as needed
3. Use skills from skills/ directories
4. Follow workflows in workflows/ for multi-step tasks

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

### Rules (11 files)

Immutable constraints — prescriptive, MUST follow:

| Rule               | Scope                                                        |
| ------------------ | ------------------------------------------------------------ |
| `global.md`        | Evidence-First, BLUF-6, heuristics, immutability constraints |
| `orchestrator.md`  | Task decomposition, strategic mapping, TKB integration       |
| `backend.md`       | Hexagonal architecture, API design, security patterns        |
| `frontend.md`      | WCAG 2.1 AA, React patterns, Tailwind best practices         |
| `testing.md`       | Test pyramid (70/20/10), AAA pattern, coverage targets       |
| `security.md`      | OWASP Top 10 (2025), secret management, CI/CD security       |
| `interfaces.md`    | Zero-fidelity contracts between agents                       |
| `decision-tree.md` | Automated role selection logic                               |
| `code-style.md`    | Naming conventions, TypeScript strict, import patterns       |
| `git-workflow.md`  | Commit format, branch strategy, spec-first flow              |
| `documentation.md` | Normalized patterns, folder structure, ADR format            |

### Specifications (5 files)

Formal reference documents — descriptive, detailed rationale:

| Specs                 | Content                                                     |
| --------------------- | ----------------------------------------------------------- |
| `asdd-lifecycle.md`   | 8-phase AI-Spec-Driven Development lifecycle                |
| `bluf-6.md`           | 6-part communication protocol                               |
| `heuristics.md`       | 10 decision heuristics with examples                        |
| `version-protocol.md` | 4-step version verification                                 |
| `memory-layer.md`     | Project memory integration (decisions/mistakes/conventions) |

### Skills (11 directories)

Specialized capabilities with optional validation scripts. Each skill has a `SKILL.md` with YAML frontmatter defining name, description, and recommended model tier.

### Workflows (9 + 3 orchestrators)

Multi-step procedures: analyze, audit, design, docs, feature-branch, product, review, technology-selection, test. Orchestrators coordinate multiple skills: full-stack-feature, security-hardening, documentation-sync.

### Templates (21 files)

Task-specific development guides with routing system. See `templates/routing.md` for keyword-to-template mapping.

| Category                  | Templates                                                                      |
| ------------------------- | ------------------------------------------------------------------------------ |
| Core Development          | brainstorming, analysis, refactoring, frontend, backend, database, testing     |
| Design & Content          | ux-ui, copywriting, documentation                                              |
| Infrastructure & Security | cicd, security-audit, penetration-testing, devops                              |
| Specialized               | api-design, system-architecture, performance, migration, code-review, research |

### Knowledge Base (106 entries)

Quantified technology metrics across 13 categories: runtimes, frontend, backend, data, testing, infrastructure, security, tooling, patterns. The Master Orchestrator queries the TKB for evidence-based technology recommendations.

---

## ASDD Lifecycle

AI-Spec-Driven Development — the recommended development workflow:

```
PLANNING (Tier 1)          EXECUTION (Tier 2)         CLOSURE
──────────────────         ──────────────────         ──────────
1. SYNC (read context)     5. EXECUTE (implement)     8. COMMIT_IMPL
2. STORY (user story)      6. TEST (write tests)
3. PLAN (atomic tasks)     7. VERIFY (typecheck)
4. COMMIT_SPEC (spec doc)
```

See `specs/asdd-lifecycle.md` for full details.

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
├── specs/                        # Formal specifications (5)
│   ├── asdd-lifecycle.md
│   ├── bluf-6.md
│   ├── heuristics.md
│   ├── version-protocol.md
│   └── memory-layer.md
│
├── rules/                       # Immutable constraints (11)
│   ├── global.md
│   ├── orchestrator.md
│   ├── backend.md
│   ├── frontend.md
│   ├── testing.md
│   ├── security.md
│   ├── interfaces.md
│   ├── decision-tree.md
│   ├── code-style.md           # NEW
│   ├── git-workflow.md          # NEW
│   └── documentation.md         # NEW
│
├── skills/                      # Agent capabilities (11)
├── workflows/                   # Multi-step procedures (9 + 3 orchestrators)
├── knowledge/                   # Technology Knowledge Base (106 entries)
├── templates/                   # Task templates (21) with routing
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
| Cursor      | Symlink `.cursor/rules` → `rules/`   | See `adapters/cursor/` |
| Claude Code | Auto-discovers skills from `skills/` | See `adapters/claude/` |
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
