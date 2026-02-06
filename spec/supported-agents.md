# Supported Agents & Editors

> Registry of AI coding agents/editors with their configuration paths, skill loading, and detection methods.

**Last Updated**: 2026-02-06
**Status**: Living Document

---

## Table of Contents

1. [Overview](#1-overview)
2. [Agent Registry](#2-agent-registry)
3. [Configuration Paths](#3-configuration-paths)
4. [Skill Loading](#4-skill-loading)
5. [Detection Methods](#5-detection-methods)
6. [MCP Support](#6-mcp-support)
7. [Adding New Agents](#7-adding-new-agents)

---

## 1. Overview

This document catalogs all AI coding agents and editors that the AIDD framework supports or plans to support. Each entry describes how the agent discovers AI configuration, where it looks for skills, and how to detect if it's installed.

### Categories

| Category | Description |
|----------|-------------|
| **CLI** | Terminal-based AI coding assistants |
| **IDE** | Full IDE or editor with built-in AI |
| **Extension** | Plugin/extension for existing editors |
| **Web** | Browser-based or cloud-hosted |

### Tier Legend

| Tier | Meaning |
|------|---------|
| **Tier A** | Full AIDD integration (skills + rules + MCP) |
| **Tier B** | Partial integration (skills or rules only) |
| **Tier C** | Planned / detection-only |

---

## 2. Agent Registry

### Tier A — Full Integration

| Agent | Display Name | Category | Skills Dir | Logo |
|-------|-------------|----------|------------|------|
| `claude-code` | Claude Code | CLI | `.claude/skills` | `assets/agents/claude-code.svg` |
| `cursor` | Cursor | IDE | `.cursor/skills` | `assets/agents/cursor.svg` |
| `windsurf` | Windsurf | IDE | `.windsurf/skills` | `assets/agents/windsurf.svg` |
| `codex` | Codex | CLI | `.agents/skills` | `assets/agents/codex.svg` |
| `gemini-cli` | Gemini CLI | CLI | `.agents/skills` | `assets/agents/gemini.svg` |

### Tier B — Partial Integration

| Agent | Display Name | Category | Skills Dir | Logo |
|-------|-------------|----------|------------|------|
| `amp` | Amp | CLI | `.agents/skills` | `assets/agents/amp.svg` |
| `github-copilot` | GitHub Copilot | Extension | `.agents/skills` | `assets/agents/copilot.svg` |
| `cline` | Cline | Extension | `.cline/skills` | `assets/agents/cline.svg` |
| `roo` | Roo Code | Extension | `.roo/skills` | `assets/agents/roo.svg` |
| `kilo` | Kilo Code | Extension | `.kilocode/skills` | `assets/agents/kilo.svg` |
| `goose` | Goose | CLI | `.goose/skills` | `assets/agents/goose.svg` |
| `opencode` | OpenCode | CLI | `.agents/skills` | `assets/agents/opencode.svg` |
| `trae` | Trae | IDE | `.trae/skills` | `assets/agents/trae.svg` |
| `continue` | Continue | Extension | `.continue/skills` | — |
| `kiro-cli` | Kiro CLI | CLI | `.kiro/skills` | `assets/agents/kiro-cli.svg` |
| `droid` | Droid | CLI | `.factory/skills` | `assets/agents/droid.svg` |

### Tier C — Detection Only

| Agent | Display Name | Category | Skills Dir | Logo |
|-------|-------------|----------|------------|------|
| `antigravity` | Antigravity | Extension | `.agent/skills` | `assets/agents/antigravity.svg` |
| `augment` | Augment | Extension | `.augment/skills` | — |
| `openclaw` | OpenClaw | CLI | `skills` | `assets/agents/clawdbot.svg` |
| `codebuddy` | CodeBuddy | Extension | `.codebuddy/skills` | — |
| `command-code` | Command Code | CLI | `.commandcode/skills` | — |
| `crush` | Crush | CLI | `.crush/skills` | — |
| `iflow-cli` | iFlow CLI | CLI | `.iflow/skills` | — |
| `junie` | Junie | IDE | `.junie/skills` | — |
| `kimi-cli` | Kimi Code CLI | CLI | `.agents/skills` | — |
| `kode` | Kode | CLI | `.kode/skills` | — |
| `mcpjam` | MCPJam | CLI | `.mcpjam/skills` | — |
| `mistral-vibe` | Mistral Vibe | CLI | `.vibe/skills` | — |
| `mux` | Mux | CLI | `.mux/skills` | — |
| `openhands` | OpenHands | CLI | `.openhands/skills` | — |
| `pi` | Pi | CLI | `.pi/skills` | — |
| `qoder` | Qoder | CLI | `.qoder/skills` | — |
| `qwen-code` | Qwen Code | CLI | `.qwen/skills` | — |
| `replit` | Replit | Web | `.agents/skills` | — |
| `trae-cn` | Trae CN | IDE | `.trae/skills` | — |
| `zencoder` | Zencoder | Extension | `.zencoder/skills` | — |
| `neovate` | Neovate | Extension | `.neovate/skills` | — |
| `pochi` | Pochi | CLI | `.pochi/skills` | — |
| `adal` | AdaL | CLI | `.adal/skills` | — |

---

## 3. Configuration Paths

How each agent discovers AI configuration files (rules, system prompts, memory).

### System Prompt / Rules Files

| Agent | Project Config | Global Config |
|-------|---------------|---------------|
| `claude-code` | `CLAUDE.md`, `.claude/settings.json` | `~/.claude/CLAUDE.md`, `~/.claude/settings.json` |
| `cursor` | `.cursor/rules/*.mdc`, `.cursorrules` | `~/.cursor/rules/` |
| `windsurf` | `.windsurfrules`, `.windsurf/rules/` | `~/.codeium/windsurf/` |
| `codex` | `AGENTS.md`, `codex.md` | `~/.codex/instructions.md` |
| `gemini-cli` | `GEMINI.md`, `.gemini/settings.json` | `~/.gemini/settings.json` |
| `github-copilot` | `.github/copilot-instructions.md` | — |
| `cline` | `.clinerules` | `~/.cline/` |
| `roo` | `.roo/rules/*.md` | `~/.roo/` |
| `amp` | `AGENTS.md` | `~/.config/amp/` |
| `goose` | `.goose/config.yaml` | `~/.config/goose/` |
| `opencode` | `AGENTS.md` | `~/.config/opencode/` |
| `trae` | `.trae/rules/` | `~/.trae/` |
| `continue` | `.continue/config.json` | `~/.continue/config.json` |
| `kilo` | `.kilocode/rules/` | `~/.kilocode/` |
| `kiro-cli` | `.kiro/rules/` | `~/.kiro/` |
| `droid` | `.factory/rules/` | `~/.factory/` |
| `augment` | `.augment/` | `~/.augment/` |
| `junie` | `.junie/guidelines.md` | `~/.junie/` |

### MCP Configuration

| Agent | MCP Config Location | Format |
|-------|--------------------|--------|
| `claude-code` | `.claude/mcp.json`, `.mcp.json` | `{ "mcpServers": { "<name>": { "command", "args" } } }` |
| `cursor` | `.cursor/mcp.json` | Same as Claude Code |
| `windsurf` | `.windsurf/mcp.json` | Same as Claude Code |
| `codex` | `.codex/mcp.json` | Same as Claude Code |
| `cline` | `.cline/mcp_settings.json` | `{ "mcpServers": { ... } }` |
| `roo` | `.roo/mcp.json` | Same as Claude Code |
| `continue` | `.continue/config.json` (mcpServers key) | Embedded in main config |
| `github-copilot` | `.vscode/mcp.json` | VS Code format |
| `gemini-cli` | `.gemini/settings.json` (mcpServers key) | Embedded in main config |
| `goose` | `.goose/config.yaml` (extensions key) | YAML format |

---

## 4. Skill Loading

### Universal Directory Agents

These agents share the `.agents/skills/` directory. A skill placed there is discovered by all of them:

- `amp`
- `codex`
- `gemini-cli`
- `github-copilot`
- `kimi-cli`
- `opencode`
- `replit`

### Agent-Specific Directory Agents

These agents use their own skill directory and need symlinks or copies from the canonical location:

| Agent | Project Skills Dir | Global Skills Dir |
|-------|-------------------|-------------------|
| `claude-code` | `.claude/skills/` | `~/.claude/skills/` |
| `cursor` | `.cursor/skills/` | `~/.cursor/skills/` |
| `windsurf` | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |
| `cline` | `.cline/skills/` | `~/.cline/skills/` |
| `roo` | `.roo/skills/` | `~/.roo/skills/` |
| `kilo` | `.kilocode/skills/` | `~/.kilocode/skills/` |
| `goose` | `.goose/skills/` | `~/.config/goose/skills/` |
| `trae` | `.trae/skills/` | `~/.trae/skills/` |
| `trae-cn` | `.trae/skills/` | `~/.trae-cn/skills/` |
| `continue` | `.continue/skills/` | `~/.continue/skills/` |
| `kiro-cli` | `.kiro/skills/` | `~/.kiro/skills/` |
| `droid` | `.factory/skills/` | `~/.factory/skills/` |
| `antigravity` | `.agent/skills/` | `~/.gemini/antigravity/skills/` |
| `augment` | `.augment/skills/` | `~/.augment/skills/` |
| `openclaw` | `skills/` | `~/.openclaw/skills/` or `~/.clawdbot/skills/` or `~/.moltbot/skills/` |

### Skill Format

All agents that support skills use the `SKILL.md` format:

```markdown
---
name: skill-name
description: What the skill does
tier: 2
tags: [tag1, tag2]
globs: ["src/**/*.ts"]
---

# Skill Name

Instructions for the agent...
```

The `SKILL.md` file is the skill itself — it contains both metadata (YAML frontmatter) and instructions (markdown body).

---

## 5. Detection Methods

How to detect if an agent is installed on the system.

### Home Directory Check

Most agents can be detected by checking for their config directory:

```javascript
const detectionPaths = {
  'claude-code': '~/.claude',
  'cursor':      '~/.cursor',
  'windsurf':    '~/.codeium/windsurf',
  'codex':       '~/.codex',
  'gemini-cli':  '~/.gemini',
  'cline':       '~/.cline',
  'roo':         '~/.roo',
  'kilo':        '~/.kilocode',
  'goose':       '~/.config/goose',       // XDG
  'amp':         '~/.config/amp',          // XDG
  'opencode':    '~/.config/opencode',     // XDG
  'trae':        '~/.trae',
  'trae-cn':     '~/.trae-cn',
  'continue':    '~/.continue',
  'kiro-cli':    '~/.kiro',
  'droid':       '~/.factory',
  'augment':     '~/.augment',
  'junie':       '~/.junie',
  'iflow-cli':   '~/.iflow',
  'crush':       '~/.config/crush',
  'zencoder':    '~/.zencoder',
  'neovate':     '~/.neovate',
  'pochi':       '~/.pochi',
  'adal':        '~/.adal',
  'qoder':       '~/.qoder',
  'qwen-code':   '~/.qwen',
  'mux':         '~/.mux',
  'mcpjam':      '~/.mcpjam',
  'openhands':   '~/.openhands',
  'mistral-vibe': '~/.vibe',
  'kode':        '~/.kode',
  'command-code': '~/.commandcode',
  'kimi-cli':    '~/.kimi',
  'pi':          '~/.pi/agent',
};
```

### Multi-Path Detection

Some agents have multiple possible locations:

| Agent | Detection Paths |
|-------|----------------|
| `openclaw` | `~/.openclaw` OR `~/.clawdbot` OR `~/.moltbot` |
| `github-copilot` | `<project>/.github` OR `~/.copilot` |
| `codebuddy` | `<project>/.codebuddy` OR `~/.codebuddy` |
| `continue` | `<project>/.continue` OR `~/.continue` |
| `antigravity` | `<project>/.agent` OR `~/.gemini/antigravity` |
| `codex` | `~/.codex` OR `/etc/codex` |
| `replit` | `<project>/.agents` (project-only) |

---

## 6. MCP Support

### Full MCP Support

These agents can run MCP servers and use MCP tools:

| Agent | MCP Format | Notes |
|-------|-----------|-------|
| `claude-code` | stdio, HTTP+SSE | Primary target. Full MCP SDK support |
| `cursor` | stdio, HTTP+SSE | Via `.cursor/mcp.json` |
| `windsurf` | stdio | Via `.windsurf/mcp.json` |
| `cline` | stdio | Via `mcp_settings.json` |
| `roo` | stdio | Via `.roo/mcp.json` |
| `continue` | stdio | Via `config.json` mcpServers key |
| `codex` | stdio | Via `.codex/mcp.json` |
| `gemini-cli` | stdio | Via settings.json |
| `goose` | stdio | Via extensions in config.yaml |
| `github-copilot` | stdio | Via VS Code mcp.json |

### No MCP Support (skills-only)

- `amp`, `trae`, `kilo`, `kiro-cli`, `augment`, `junie`
- Most Tier C agents

---

## 7. Adding New Agents

To add a new agent to the AIDD registry:

1. **Research** — Determine the agent's config paths, skill directory, and detection method
2. **Update this document** — Add entries to Sections 2-6
3. **Download logo** — Save SVG to `assets/agents/<agent-name>.svg`
4. **Update mcp-doctor** — Add detection path to the Integrations diagnostic section in `scripts/mcp-doctor.mjs`
5. **Test detection** — Run `pnpm mcp:doctor` and verify the agent appears when installed

### Logo Source

Agent logos are sourced from [skills.sh](https://skills.sh) where available. Format: SVG, stored in `assets/agents/`.

Current logos: `amp`, `antigravity`, `claude-code`, `clawdbot`, `cline`, `codex`, `copilot`, `cursor`, `droid`, `gemini`, `goose`, `kilo`, `kiro-cli`, `opencode`, `roo`, `trae`, `vscode`, `windsurf`.
