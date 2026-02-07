# Implementation Summary — Structured Completion Report

> Concise, structured report produced at the end of every SHIP phase. Replaces verbose status dumps with scannable facts.

**Last Updated**: 2026-02-07
**Status**: Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Format](#2-format)
3. [Sections](#3-sections)
4. [Constraints](#4-constraints)
5. [Examples](#5-examples)

---

## 1. Overview

The Implementation Summary is a required deliverable of PHASE 6 — SHIP in the AIDD lifecycle. It communicates what was built, how it's wired, and whether it works — in 20 lines or less.

This is not documentation. It is not a PR description. It is the final status report the user reads after implementation completes. If it says "pass", it must actually pass. If it says "implemented", the code must exist.

---

## 2. Format

```
## [status] [Feature Name] — [Status]

**[Section Label]**
- [status] [Key]: [Value]
- [status] [Key]: [Value]

**[Section Label]**
- [status] [Component]: [result]

**Data Flow** (when applicable)
```
[source] → [transform] → [destination]
```
```

Status indicators: checkmark (pass/done), warning (partial/issue), cross (fail/missing).

---

## 3. Sections

Every summary MUST include these sections (in order):

### 3.1 Architecture

What was built and how it connects. Layer names, patterns used, key abstractions.

### 3.2 Wiring

How components are connected. Dependency injection, service initialization, adapter selection.

### 3.3 Build Status

Pass/fail for each verification step: cargo check, typecheck, lint, test, build.

### 3.4 Data Flow (when applicable)

How data moves through the system. Maximum 6 lines. Use arrows and component names.

### 3.5 Commits

List of commits produced during this SHIP phase.

---

## 4. Constraints

| Constraint | Value | Rationale |
|-----------|-------|-----------|
| Maximum lines | 20 | Forces conciseness. If it doesn't fit, it's not concise enough. |
| Filler words | Forbidden | No "successfully", "properly", "correctly". State the fact. |
| Buzzwords | Forbidden | No "leveraging", "robust", "seamless". Use precise terms. |
| Unverified claims | Forbidden | Every status indicator must correspond to an actual check. |
| Format consistency | Required | Same structure every time. Agents learn patterns through repetition. |

---

## 5. Examples

### Minimal (bug fix)

```
## [pass] Fix ContentLoader Specs — Complete

**Architecture**
- [pass] ContentLoader: Added project specs fallback when bundledRoot is null

**Build**
- [pass] TypeScript: tsc --noEmit
- [pass] MCP Build: all packages

**Commits**
- 8969e95 fix(core): allow project specs when bundledRoot is null
```

### Standard (feature)

```
## [pass] Hub Memory Service — Complete

**Architecture**
- [pass] Domain: MemoryPort trait (zero deps)
- [pass] Application: MemoryService (port abstraction only)
- [pass] Infrastructure: SqliteMemoryAdapter (active project resolution)
- [pass] Presentation: 5 Tauri commands

**Wiring**
- ProjectService → SqliteMemoryAdapter → MemoryService → Tauri Commands → React Store
- 60s cache, graceful error fallbacks

**Build**
- [pass] Rust: cargo check
- [pass] TypeScript: tsc --noEmit

**Data Flow**
Frontend invoke('get_sessions') → Tauri command → MemoryService → SqliteMemoryAdapter → {project}/.aidd/data.db

**Commits**
- 841c12b feat: implement memory infrastructure
- ba24a4a refactor: implement DDD + Hexagonal for memory service
- 14ccf88 feat(hub/memory): wire active project database path
```

---

## Cross-References

- **Lifecycle**: `specs/aidd-lifecycle.md` (PHASE 6 — SHIP)
- **Deliverables rule**: `rules/deliverables.md`
- **Communication**: `specs/bluf-6.md`
