# Claude Code Adapter

> AIDD integration guide for Claude Code (claude.ai/claude-code)

**Last Updated**: 2026-02-06
**Status**: Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Setup](#2-setup)
3. [Skill Discovery](#3-skill-discovery)
4. [MCP Integration](#4-mcp-integration)
5. [Template System](#5-template-system)
6. [Memory Layer](#6-memory-layer)

---

## 1. Overview

Claude Code natively reads `AGENTS.md` at the project root and any `CLAUDE.md` files in the repository. AIDD leverages this behavior to provide structured agent coordination, rules, skills, and workflows without additional tooling.

---

## 2. Setup

Create a project-level `CLAUDE.md` that references `AGENTS.md` as the single source of truth:

```markdown
# Project CLAUDE.md

> This project uses the AIDD standard.

Load `AGENTS.md` as the primary context document.
Follow all rules defined in `content/rules/global.md`.
Consult `content/skills/` for specialized capabilities.
```

Claude Code will automatically load `CLAUDE.md` on session start. The file should be concise and act as a pointer to AIDD artifacts rather than duplicating content.

---

## 3. Skill Discovery

Claude Code reads `AGENTS.md` automatically when present at the project root. The system hierarchy defined in AGENTS.md exposes:

- **Rules** (`content/rules/`): Immutable constraints Claude Code must follow
- **Skills** (`content/skills/<name>/SKILL.md`): Specialized capabilities with model tier hints
- **Workflows** (`content/workflows/`): Multi-step procedures for complex tasks
- **Memory** (`memory/`): Persistent context across sessions

Claude Code resolves skills by reading `SKILL.md` frontmatter for name, description, and recommended model tier.

---

## 4. MCP Integration

Claude Code supports MCP (Model Context Protocol) servers for tool calling. AIDD skills that define validation scripts or external tools can be exposed via MCP:

1. Configure MCP servers in `~/.claude/mcp.json` or project-level `.claude/mcp.json`
2. AIDD skill scripts in `content/skills/<name>/scripts/` can be registered as MCP tools
3. The `ToolProvider` port pattern applies: builtin tools, MCP tools, and plugin tools are unified under a single interface

---

## 5. Template System

Claude Code supports a global template system via `~/.claude/templates/`. AIDD integrates by:

1. Placing reusable prompt templates in `~/.claude/templates/`
2. Routing tasks to templates based on domain and complexity (see `templates/routing.md`)
3. Templates map to AIDD skills: `frontend` template maps to Interface Artisan skill, `backend` maps to System Architect, etc.

---

## 6. Memory Layer

AIDD provides a persistent memory layer through `memory/`:

| File | Purpose |
|------|---------|
| `decisions.json` | Architecture and technology decisions with rationale |
| `mistakes.json` | Errors encountered and corrections applied |
| `conventions.json` | Project-specific conventions discovered during development |

Claude Code should consult memory files at session start and update them when significant decisions, mistakes, or conventions are identified.
