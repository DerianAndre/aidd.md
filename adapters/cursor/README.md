# Cursor Adapter

> AIDD integration guide for Cursor (cursor.sh)

**Last Updated**: 2026-02-06
**Status**: Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Setup via Symlink](#2-setup-via-symlink)
3. [Rules Mapping](#3-rules-mapping)
4. [Context Loading](#4-context-loading)

---

## 1. Overview

Cursor reads its configuration from `.cursor/rules/` at the project root. AIDD uses a symlink approach to map `.cursor/rules` to the `content/rules` directory, allowing a single source of truth shared across IDEs.

---

## 2. Setup via Symlink

Create a symlink so Cursor reads AIDD rules directly:

**Windows (PowerShell as Admin):**
```powershell
mklink /D .cursor\rules content\rules
```

**Unix (macOS/Linux):**
```bash
ln -s content/rules .cursor/rules
```

This maps `.cursor/rules/` to `content/rules/`, giving Cursor direct access to all AIDD rule files without duplication.

---

## 3. Rules Mapping

Cursor's `.cursor/rules` directory maps directly to AIDD's `content/rules/` structure:

| AIDD Path | Cursor Reads As |
|-----------|----------------|
| `content/rules/global.md` | `.cursor/rules/global.md` |
| `content/rules/backend.md` | `.cursor/rules/backend.md` |
| `content/rules/frontend.md` | `.cursor/rules/frontend.md` |

`global.md` supersedes all domain-specific rules, consistent with the AIDD hierarchy.

---

## 4. Context Loading

Cursor reads `AGENTS.md` at the project root for high-level context. Ensure `AGENTS.md` includes:

- Role definitions and the Master Orchestrator entry point
- System map pointing to `content/rules/`, `content/skills/`, `content/workflows/`
- Golden Rules as immutable constraints

Cursor will use this context to inform code generation, completions, and chat responses within the IDE.
