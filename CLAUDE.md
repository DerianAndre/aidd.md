# AIDD — Claude Code Adapter

> Project-specific Claude Code instructions for the aidd.md repository.
> Read `AGENTS.md` for the universal AIDD workflow protocol.

---

## Startup

Call `aidd_start` at the beginning of each conversation when MCP tools are available.

If MCP unavailable: follow `AGENTS.md` directly, read `content/` files as needed. Run `pnpm mcp:check` to verify status.

---

## Workflow

Follow the adaptive workflow in `AGENTS.md` §1. The AI picks depth based on task complexity. The user can override.

When MCP tools are available, enhance the workflow:

- **UNDERSTAND**: `aidd_memory_search` for prior context. Create brainstorm artifact if exploring options.
- **PLAN**: Use plan mode. Create plan artifact for non-trivial work.
- **BUILD**: Update session at task boundaries. Record observations for significant learnings.
- **VERIFY**: Run `pnpm mcp:typecheck && pnpm mcp:build`. Create checklist artifact if tracking multiple checks.
- **SHIP**: Persist learnings to memory. `aidd_session { action: "end" }`.

Artifacts, observations, and session updates are **encouraged, not mandatory**. Use them when they add value.

---

## Project Overview

This is the **aidd.md** repository — the open standard for AI-Driven Development.

- `content/` — Framework content (rules, skills, workflows, specs, knowledge, templates)
- `packages/` — Shared libraries and CLI
- `mcps/` — MCP server packages (Core, Memory, Tools + Engine)
- `apps/` — Applications (Hub)
- `.aidd/` — This repo's project state

### Commands

| Command | Purpose |
|---------|---------|
| `pnpm setup` | Full setup (alias: `pnpm mcp:setup`) |
| `pnpm mcp:build` | Build all MCP packages |
| `pnpm mcp:dev` | Watch mode for MCP development |
| `pnpm mcp:typecheck` | TypeScript type checking |
| `pnpm mcp:test` | Run MCP tests |
| `pnpm mcp:check` | Single-line startup status |
| `pnpm mcp:doctor` | Full diagnostic |

### Tech Stack

- **Runtime**: Node.js 22 LTS
- **Package Manager**: pnpm 10
- **Language**: TypeScript 5.9 (strict mode)
- **MCP SDK**: @modelcontextprotocol/sdk
- **Validation**: Zod 4
- **Build**: tsup

### Package Structure

```
packages/
  shared/           @aidd.md/mcp-shared    (types, utils, server factory)
  cli/              @aidd.md/cli           (CLI)

mcps/
  mcp-aidd-engine/  @aidd.md/mcp-engine    (all modules in one process)
  mcp-aidd-core/    @aidd.md/mcp-core      (guidance, routing, knowledge)
  mcp-aidd-memory/  @aidd.md/mcp-memory    (sessions, memory, evolution)
  mcp-aidd-tools/   @aidd.md/mcp-tools     (validation, enforcement, CI)
```

### Rules

1. `content/routing.md` is SSOT for agent roles
2. ES modules only (`import`/`export`), never `require`
3. TypeScript strict mode, no `any` without documented exception
4. Evidence-first: logic/data/principles, never opinions

**Note:** This repo's `.aidd/config.json` points to `../content/*` because `content/` at root IS the framework source. Adopter projects copy `content/` into `.aidd/content/`.
