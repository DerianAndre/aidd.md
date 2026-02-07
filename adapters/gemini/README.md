# Gemini Adapter

> AIDD integration guide for Gemini (Antigravity / Google AI Studio)

**Last Updated**: 2026-02-06
**Status**: Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Native AGENTS.md Support](#2-native-agentsmd-support)
3. [Content Directory Convention](#3-content-directory-convention)
4. [System Prompt Integration](#4-system-prompt-integration)

---

## 1. Overview

Gemini's Antigravity tooling natively auto-loads `AGENTS.md` from the project root. This makes AIDD integration zero-configuration for Gemini-powered development environments.

---

## 2. Native AGENTS.md Support

Antigravity detects and loads `AGENTS.md` automatically. No additional setup is required. The file serves as the single source of truth for:

- Agent roles and coordination patterns
- Rules hierarchy (`content/rules/global.md` as supreme constraint)
- Skill discovery (`content/skills/<name>/SKILL.md`)
- Workflow procedures (`content/workflows/`)

---

## 3. Content Directory Convention

Gemini reads the `content/` directory for AIDD framework files:

```
content/
  rules/       -> Domain-specific rules
  skills/      -> Specialized agent capabilities
  workflows/   -> Step-by-step procedures
  knowledge/   -> Technology Knowledge Base
```

When `content/` is present alongside `AGENTS.md`, Gemini reads its contents for a complete AIDD context.

---

## 4. System Prompt Integration

For direct Gemini API usage, inject `AGENTS.md` as system context:

1. Read `AGENTS.md` content at runtime
2. Prepend as a system instruction in the Gemini API request
3. Include relevant `content/rules/global.md` content as immutable constraints
4. Append domain-specific rules based on the task context

This ensures API-level Gemini calls follow the same AIDD standards as IDE-integrated workflows.
