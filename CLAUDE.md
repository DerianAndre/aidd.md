# AIDD — Project Instructions for Claude Code

> AI-Driven Development Framework — MCP Ecosystem
> **Last Updated**: 2026-02-07

---

## Startup Protocol

**Run at the start of every conversation:**

1. **MCP available** — Call the `aidd_bootstrap` MCP tool. This returns project detection, agent summary, active rules, and suggested next steps.
2. **MCP unavailable (fallback)** — Run `pnpm mcp:check` in the terminal.

Expected status from fallback:
- `[aidd.md] Engine - ONy` — All MCP packages built and ready
- `[aidd.md] Engine - PARTIAL` — Some packages need rebuilding
- `[aidd.md] Engine - OFF` — Setup required

If the check fails, follow the remediation hint in the output.

---

## Project Overview

This is the **aidd.md** repository — the open standard for AI-Driven Development. It contains:

- **AGENTS.md** — Thin redirect to content/agents/ (Gemini compatibility)
- **content/agents/** — Agent definitions (routing.md + per-agent files)
- **content/rules/** — Domain-specific rules (global, orchestrator, frontend, backend, etc.)
- **content/skills/** — Specialized agent capabilities with SKILL.md + validation scripts
- **content/workflows/** — Step-by-step guides for complex multi-agent tasks
- **content/specs/** — AIDD standard specifications (lifecycle, memory layer, heuristics, etc.)
- **content/knowledge/** — Technology Knowledge Base (TKB) entries
- **content/templates/** — Task routing and decision templates
- **packages/** — Shared libraries and CLI
- **mcps/** — MCP server packages (Core, Memory, Tools + Engine)
- **.aidd/** — This repo's project state (uses content/ via config)

---

## SSOT

`content/agents/routing.md` is the canonical agent hierarchy. Root `AGENTS.md` is a thin redirect for Gemini compatibility. If there is conflict between agent definitions and other files, agents win.

---

## Commands

| Command              | Purpose                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm setup`         | Full setup: install deps, build, detect IDEs, configure, verify (alias: `pnpm mcp:setup`)       |
| `pnpm mcp:build`     | Build all MCP packages                                                                          |
| `pnpm mcp:dev`       | Watch mode for MCP development                                                                  |
| `pnpm mcp:test`      | Run MCP tests                                                                                   |
| `pnpm mcp:typecheck` | TypeScript type checking                                                                        |
| `pnpm mcp:clean`     | Clean build artifacts                                                                           |
| `pnpm mcp:status`    | Detailed package build status                                                                   |
| `pnpm mcp:doctor`    | Full diagnostic (supports `--json`, `--fix`, `--deep`, `--quiet`, `--no-runtime`, `--no-color`) |
| `pnpm mcp:check`     | Single-line status for startup                                                                  |

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

1. Follow `content/agents/routing.md` as SSOT for agent roles
2. Load domain-specific rules from `content/rules/` as needed
3. Use skills from `content/skills/[agent]/SKILL.md` for specialized tasks
4. Follow workflows from `content/workflows/` for multi-step procedures
5. ES modules only (`import`/`export`), never `require`
6. TypeScript strict mode, no `any` without documented exception
7. Evidence-first: logic/data/principles, never opinions

**Note:** This repo's `.aidd/config.json` points to `../content/*` because `content/` at root IS the framework source that gets bundled in npm packages. Adopter projects copy `content/` into their `.aidd/content/` directory.

---

## Package Structure

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

See [mcps/README.md](mcps/README.md) for full architecture and [mcps/PLAN.md](mcps/PLAN.md) for implementation roadmap.
