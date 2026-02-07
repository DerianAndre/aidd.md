# Warp Adapter

> AIDD integration guide for Warp (warp.dev)

**Last Updated**: 2026-02-04
**Status**: Reference

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Commands](#2-commands)
3. [Architecture](#3-architecture)
4. [Golden Rules](#4-golden-rules)
5. [Anti-Bias Protocol](#5-anti-bias-protocol)
6. [Adding New Components](#6-adding-new-components)

---

## 1. Project Overview

**AI-Driven Development (AIDD)** - A multi-IDE agent framework compatible with Antigravity, Cursor, and Claude Code. This repository defines AI agent roles, rules, skills, workflows, and a Technology Knowledge Base (TKB) for evidence-based development.

---

## 2. Commands

```bash
# Install dependencies (required for validation scripts)
npm install

# Validate Mermaid C4 diagrams
npm run validate:mermaid "C4Container..."
npx tsx content/skills/system-architect/scripts/validate-mermaid.ts diagram.mmd

# Validate OpenAPI specs
npm run validate:openapi spec.yaml

# Validate SQL DDL
npm run validate:sql schema.sql

# Scan for hardcoded secrets
npm run scan:secrets src/config.ts
```

---

## 3. Architecture

### Core Philosophy

- **Evidence-First**: Decisions must trace to fundamental principles, empirical data, or standards -- never opinions
- **BLUF Communication**: Bottom Line Up Front -- direct answers first, then context, trade-offs, alternatives
- **First Principles**: Deconstruct problems to atomic truths before building solutions
- **Zero Bullshit**: No hedging language, corporate speak, or fluff

### System Hierarchy

```
AGENTS.md (Single Source of Truth)
    |-- content/
    |   |-- rules/ (Immutable constraints)
    |   |   \-- global.md supersedes all domain rules
    |   |-- skills/ (Specialized capabilities)
    |   |   \-- Each has SKILL.md + optional scripts/
    |   |-- workflows/ (Multi-step procedures)
    |   |   \-- orchestrators/ (Multi-agent coordination)
    |   \-- knowledge/ (Technology Knowledge Base)
```

### Agent Activation Pattern

The **Master Orchestrator** is the entry point for all tasks:

1. Validates context (>90% confidence required before execution)
2. Queries TKB (`content/knowledge/`) for technology recommendations
3. Maps to appropriate Rules, Workflows, and Skills
4. Delegates to specialized agents (System Architect, Contract Architect, etc.)

### Orchestrator Model Strategy

Orchestrators optimize cost via tiered model usage:

- **Tier 1 (HIGH)**: Critical planning and architecture decisions
- **Tier 2 (STANDARD)**: Complex implementation patterns
- **Tier 3 (LOW)**: Fast operations (code generation, tests, docs)

### Skill Structure

Skills are defined in `content/skills/<name>/SKILL.md` with YAML frontmatter:

```yaml
---
name: skill-name
description: When to use this skill
tier: 1|2|3
---
```

Optional: `scripts/` directory for TypeScript validation tools.

### Technology Knowledge Base (TKB)

`content/knowledge/` contains quantified metrics for 50+ technologies organized by domain:

- `runtimes/` - Bun, Node.js, Deno benchmarks
- `frontend/` - Next.js, Astro, Remix patterns
- `data/` - ORMs, databases, caching
- `security/` - OWASP 2026, authentication

Query TKB before making technology recommendations. Present comparison matrices with trade-offs.

---

## 4. Golden Rules

These immutable constraints apply to all contexts:

1. Never break backward compatibility without explicit confirmation
2. Never commit secrets to version control
3. Never disable tests to make CI pass
4. Never use `any` type in TypeScript without documented exception
5. Never use `SELECT *` in production SQL
6. Readability > Cleverness

---

## 5. Anti-Bias Protocol

Before finalizing decisions, check for:

- **Sunk Cost**: Would we choose this if starting fresh?
- **Survivorship Bias**: Do we have Netflix/Google's constraints?
- **Confirmation Bias**: Have we searched for counter-evidence?
- **Recency Bias**: Is this HackerNews trending or genuinely superior?

---

## 6. Adding New Components

**New Skill**: Create `content/skills/<name>/SKILL.md` with YAML frontmatter, add validation scripts to `scripts/`, update `AGENTS.md`.

**New Rule**: Add `content/rules/<domain>.md`, reference from `AGENTS.md`.

**New Workflow**: Create `content/workflows/<name>.md` with numbered steps.

**New Orchestrator**: Follow `content/workflows/SPEC.md` format -- requires 3+ skills, model tier specs, success criteria, and cost estimation.
