# AGENTS.md — Full AIDD Setup

> Complete agent configuration with 5 roles, memory, skills, and spec support.

**Last Updated**: 2026-02-04
**Status**: Reference

---

## Table of Contents

1. [Roles](#1-roles)
2. [System Map](#2-system-map)
3. [Orchestrator Model Strategy](#3-orchestrator-model-strategy)
4. [Activation Pattern](#4-activation-pattern)
5. [Golden Rules](#5-golden-rules)

---

## 1. Roles

### Master Orchestrator
Entry point for all tasks. Validates context (>90% confidence required), classifies work by domain and complexity, queries memory for prior decisions and mistakes, and delegates to specialized roles. Uses the highest model tier for planning.

### Architect
System design and technical decision-making. Defines architecture, evaluates trade-offs, produces ADRs, and validates structural integrity. Consults `spec/` documents for formal specifications.

### Builder
Implementation role. Writes code, creates files, integrates components. Follows all rules in `rules/` hierarchy. Executes skills from `skills/` when specialized work is required.

### Reviewer
Quality assurance and code review. Validates correctness, convention compliance, test coverage, and security posture. Updates `memory/mistakes.json` when issues are found.

### Documenter
Documentation and specification writing. Produces specs, guides, ADRs, and changelogs. Maintains `memory/conventions.json` and ensures documentation stays current with implementation.

---

## 2. System Map

```
AGENTS.md (Single Source of Truth)
    |-- rules/
    |   |-- global.md (Immutable constraints — supersedes all)
    |   |-- backend.md (Backend domain rules)
    |   \-- frontend.md (Frontend domain rules)
    |-- skills/
    |   \-- <name>/
    |       |-- SKILL.md (Frontmatter + instructions)
    |       \-- scripts/ (Optional validation tools)
    |-- memory/
    |   |-- decisions.json (Architecture decisions)
    |   |-- mistakes.json (Errors and corrections)
    |   \-- conventions.json (Discovered conventions)
    \-- spec/
        \-- (Formal specifications and ADRs)
```

---

## 3. Orchestrator Model Strategy

Optimize cost and quality via tiered model usage:

| Tier | Model | Tasks |
|------|-------|-------|
| 1 (High) | Opus | Architecture, security, planning, spec writing |
| 2 (Standard) | Sonnet | Implementation, integration, API design |
| 3 (Low) | Haiku | Tests, boilerplate, formatting, i18n, docs |

---

## 4. Activation Pattern

1. **Orchestrator** receives task
2. Validates context — asks clarifying questions if confidence <90%
3. Consults `memory/` for prior decisions, mistakes, and conventions
4. Classifies task: domain, nature, complexity, effort tier
5. Loads relevant `rules/` constraints
6. Delegates to appropriate role (Architect, Builder, Reviewer, or Documenter)
7. Role executes using `skills/` when specialized capability is needed
8. Reviewer validates output
9. Orchestrator updates `memory/` with any new decisions or conventions

---

## 5. Golden Rules

These immutable constraints apply to all roles and all contexts:

1. Never break backward compatibility without explicit confirmation
2. Never commit secrets to version control
3. Never disable tests to make CI pass
4. Never use `any` type in TypeScript without documented exception
5. Never use `SELECT *` in production SQL
6. Readability > Cleverness

---

## Anti-Bias Protocol

Before finalizing any decision, check for:

- **Sunk Cost**: Would we choose this if starting fresh?
- **Survivorship Bias**: Do we have Netflix/Google's constraints?
- **Confirmation Bias**: Have we searched for counter-evidence?
- **Recency Bias**: Is this HackerNews trending or genuinely superior?
