# AIDD — Project Instructions for Claude Code

> AI-Driven Development Framework — MCP Ecosystem
> **Last Updated**: 2026-02-05

---

## Startup Protocol

**Run at the start of every conversation:**

```bash
pnpm mcp:check
```

This outputs a single-line status indicator:
- `[aidd.md] AI Engine - ON` — All MCP packages built and ready
- `[aidd.md] AI Engine - PARTIAL` — Some packages need rebuilding
- `[aidd.md] AI Engine - OFF` — Setup required

If the check fails, follow the remediation hint in the output.

---

## Project Overview

This is the **aidd.md** repository — the open standard for AI-Driven Development. It contains:

- **AGENTS.md** — Single Source of Truth (SSOT) for agent roles and coordination
- **rules/** — Domain-specific rules (global, orchestrator, frontend, backend, etc.)
- **skills/** — Specialized agent capabilities with SKILL.md + validation scripts
- **workflows/** — Step-by-step guides for complex multi-agent tasks
- **spec/** — AIDD standard specifications (ASDD lifecycle, memory layer, heuristics, etc.)
- **knowledge/** — Technology Knowledge Base (TKB) entries
- **templates/** — Task routing and decision templates
- **mcps/** — MCP server packages (Core, Memory, Tools + Monolithic)

---

## SSOT

`AGENTS.md` is the canonical source. If there is conflict between AGENTS.md and other files, AGENTS.md wins.

---

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm mcp:setup` | Full setup: install deps, build packages, init .aidd/ |
| `pnpm mcp:build` | Build all MCP packages |
| `pnpm mcp:dev` | Watch mode for MCP development |
| `pnpm mcp:test` | Run MCP tests |
| `pnpm mcp:typecheck` | TypeScript type checking |
| `pnpm mcp:clean` | Clean build artifacts |
| `pnpm mcp:status` | Detailed package build status |
| `pnpm mcp:doctor` | Full diagnostic (environment, packages, framework) |
| `pnpm mcp:check` | Single-line status for startup |

---

## Tech Stack (This Repo)

- **Runtime**: Node.js 22 LTS
- **Package Manager**: pnpm 10
- **Language**: TypeScript 5.9 (strict mode)
- **MCP SDK**: @modelcontextprotocol/sdk
- **Validation**: Zod 4
- **Build**: tsup
- **Testing**: Vitest 4

---

## Rules

1. Follow `AGENTS.md` as SSOT for agent roles
2. Load domain-specific rules from `rules/` as needed
3. Use skills from `skills/[agent]/SKILL.md` for specialized tasks
4. Follow workflows from `workflows/` for multi-step procedures
5. ES modules only (`import`/`export`), never `require`
6. TypeScript strict mode, no `any` without documented exception
7. Evidence-first: logic/data/principles, never opinions

---

## MCP Package Structure

```
mcps/
  shared/           @aidd.md/mcp-shared    (types, utils, server factory)
  mcp-aidd/         @aidd.md/mcp           (monolithic — all modules)
  mcp-aidd-core/    @aidd.md/mcp-core      (brain — guidance, routing, knowledge)
  mcp-aidd-memory/  @aidd.md/mcp-memory    (memory — sessions, evolution, analytics)
  mcp-aidd-tools/   @aidd.md/mcp-tools     (hands — validation, enforcement, CI)
```

See [mcps/README.md](mcps/README.md) for full architecture and [mcps/PLAN.md](mcps/PLAN.md) for implementation roadmap.
