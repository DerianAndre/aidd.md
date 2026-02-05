# Cursor Adapter

> AIDD integration guide for Cursor (cursor.sh)

**Last Updated**: 2026-02-04
**Status**: Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Setup via Symlink](#2-setup-via-symlink)
3. [Rules Mapping](#3-rules-mapping)
4. [Context Loading](#4-context-loading)

---

## 1. Overview

Cursor reads its configuration from `.cursor/rules/` at the project root. AIDD uses a symlink approach to map `.cursor` to the `.agentic` directory, allowing a single source of truth shared across IDEs.

---

## 2. Setup via Symlink

Create a symlink so Cursor reads AIDD rules directly:

**Windows (PowerShell as Admin):**
```powershell
mklink /D .cursor .agentic
```

**Unix (macOS/Linux):**
```bash
ln -s .agentic .cursor
```

This maps `.cursor/rules/` to `.agentic/rules/`, giving Cursor direct access to all AIDD rule files without duplication.

---

## 3. Rules Mapping

Cursor's `.cursor/rules` directory maps directly to AIDD's `rules/` structure:

| AIDD Path | Cursor Reads As |
|-----------|----------------|
| `rules/global.md` | `.cursor/rules/global.md` |
| `rules/backend.md` | `.cursor/rules/backend.md` |
| `rules/frontend.md` | `.cursor/rules/frontend.md` |

`global.md` supersedes all domain-specific rules, consistent with the AIDD hierarchy.

---

## 4. Context Loading

Cursor reads `AGENTS.md` at the project root for high-level context. Ensure `AGENTS.md` includes:

- Role definitions and the Master Orchestrator entry point
- System map pointing to `rules/`, `skills/`, `workflows/`, and `memory/`
- Golden Rules as immutable constraints

Cursor will use this context to inform code generation, completions, and chat responses within the IDE.
