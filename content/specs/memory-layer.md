# Memory Layer — Project Memory Integration Pattern

> Persistent, structured memory that accumulates project decisions, mistakes, and conventions across sessions.

**Last Updated**: 2026-02-18
**Status**: Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [File Location](#2-file-location)
3. [Schema Definitions](#3-schema-definitions)
4. [Usage Pattern](#4-usage-pattern)
5. [AIDD Integration](#5-aidd-integration)
6. [Maintenance](#6-maintenance)

---

## 1. Overview

The Memory Layer provides persistent context across development sessions. It stores three categories of project knowledge: architectural decisions and their rationale, mistakes and their prevention strategies, and coding conventions with examples. This memory is consulted before planning and updated after significant work.

The memory is not a log. It is a curated knowledge base. Entries are added deliberately, not automatically. Each entry must provide actionable value for future sessions.

---

## 2. File Location

Memory files live in the project root under one of two paths:

- `.aidd/memory/` (preferred, within the `.aidd/` project state folder)
- `memory/` (alternative, at project root)

Three JSON files:

```
.aidd/memory/
  decisions.json
  mistakes.json
  conventions.json
```

If the directory does not exist, create it when the first memory entry is warranted. Do not create empty files preemptively.

---

## 3. Schema Definitions

### decisions.json

Records significant architectural or technical decisions with full context.

```typescript
// Schema (Zod-style definition)
const DecisionEntry = z.object({
  date: z.string(),                          // ISO 8601 date: "2026-02-04"
  context: z.string(),                       // What situation prompted the decision
  decision: z.string(),                      // What was decided
  rationale: z.string(),                     // Why this option was chosen
  alternatives_considered: z.array(          // Other options evaluated
    z.object({
      option: z.string(),                    // Alternative description
      rejected_because: z.string()           // Why it was not chosen
    })
  )
})

const DecisionsFile = z.object({
  decisions: z.array(DecisionEntry)
})
```

**Example entry**:

```json
{
  "date": "2026-02-04",
  "context": "Chat system needs persistence. Options: localStorage, IndexedDB, SQLite.",
  "decision": "Use SQLite via tauri-plugin-sql for chat persistence.",
  "rationale": "Structured queries, FTS5 for search, relational model fits chat/message hierarchy. Tauri plugin provides native SQLite access.",
  "alternatives_considered": [
    { "option": "localStorage", "rejected_because": "5MB limit, no structured queries, no full-text search" },
    { "option": "IndexedDB", "rejected_because": "Complex API, no FTS, poor fit for relational data" }
  ]
}
```

### mistakes.json

Records errors, bugs, or misjudgments with root cause analysis and prevention strategies.

```typescript
const MistakeEntry = z.object({
  date: z.string(),                          // ISO 8601 date
  description: z.string(),                   // What went wrong
  root_cause: z.string(),                    // Why it happened
  fix: z.string(),                           // How it was resolved
  prevention: z.string()                     // How to prevent recurrence
})

const MistakesFile = z.object({
  mistakes: z.array(MistakeEntry)
})
```

**Example entry**:

```json
{
  "date": "2026-01-28",
  "description": "Generated Tailwind config as tailwind.config.js for a Tailwind v4 project.",
  "root_cause": "Training data referenced Tailwind v3 patterns. Version check was not performed.",
  "fix": "Removed tailwind.config.js. Migrated configuration to CSS-only @theme block.",
  "prevention": "Always run Version Verification Protocol (Step 1) before generating framework-specific code."
}
```

### conventions.json

Records project-specific coding conventions with rationale and examples.

```typescript
const ConventionEntry = z.object({
  category: z.string(),                      // "naming", "architecture", "testing", "styling", etc.
  convention: z.string(),                    // The convention statement
  rationale: z.string(),                     // Why this convention exists
  examples: z.array(z.string())             // Code examples or references
})

const ConventionsFile = z.object({
  conventions: z.array(ConventionEntry)
})
```

**Example entry**:

```json
{
  "category": "architecture",
  "convention": "Domain aggregates are immutable. All mutation methods return new instances.",
  "rationale": "Prevents accidental state corruption. Enables undo/redo via snapshot comparison.",
  "examples": [
    "const updated = aggregate.addNode(node); // returns new FlowAggregate",
    "FlowAggregate.create() // factory method, not constructor"
  ]
}
```

---

## 4. Usage Pattern

### When to Read Memory

- **Before planning**: Consult `decisions.json` for prior architectural context. Avoid re-debating settled decisions without new information.
- **Before implementing**: Consult `conventions.json` to match existing patterns. Consult `mistakes.json` to avoid known pitfalls.
- **When encountering unexpected behavior**: Check `mistakes.json` for similar past issues.

### When to Write Memory

- **After a significant architectural decision**: Add to `decisions.json` with full context and alternatives.
- **After discovering a non-obvious bug or mistake**: Add to `mistakes.json` with root cause and prevention.
- **After establishing a new convention**: Add to `conventions.json` with rationale and examples.

### When NOT to Write Memory

- Routine implementation details that follow existing patterns.
- Temporary workarounds that will be removed.
- Personal preferences that are not project-wide conventions.

---

## 5. AIDD Integration

The Memory Layer integrates with the AIDD lifecycle at specific phases:

| AIDD Phase | Memory Action |
|------------|---------------|
| **PHASE 1 — UNDERSTAND** | Read all three memory files. Load decisions and conventions into active context. Note relevant past mistakes. |
| **PHASE 2 — PLAN** | Check `decisions.json` for prior decisions that affect the plan. Check `mistakes.json` for known pitfalls in the planned area. |
| **PHASE 4 — BUILD** | Consult `conventions.json` to ensure implementation matches project patterns. |
| **PHASE 6 — SHIP** | Update `decisions.json` if new architectural decisions were made. Update `mistakes.json` if errors were encountered and resolved. Update `conventions.json` if new patterns were established. |

The memory is not updated in every phase. Only when a significant, reusable insight emerges.

---

## 6. Maintenance

### Pruning

Memory files grow over time. Periodically review and prune:

- Remove decisions that are no longer relevant (technology was replaced, feature was removed).
- Remove mistakes that are no longer possible (the vulnerable code path was eliminated).
- Consolidate conventions that have been superseded by updated patterns.

### Conflict Resolution

If a new decision contradicts a prior one in `decisions.json`, do not delete the old entry. Add the new decision with context explaining why the prior decision was reversed. This preserves the reasoning history.

### File Size

Keep each file under 100 entries. If a file exceeds this, prioritize entries by recency and relevance. Archive old entries to a separate `memory/archive/` directory if historical preservation is needed.
