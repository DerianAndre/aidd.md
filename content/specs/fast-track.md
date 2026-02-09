# Fast-Track — Per-Phase Workflow Skip

> Lightweight workflow for trivial tasks that don't need full brainstorm-plan-test ceremony.

**Last Updated**: 2026-02-09
**Status**: Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Classification](#2-classification)
3. [Skip Semantics](#3-skip-semantics)
4. [Escalation](#4-escalation)
5. [Compliance Impact](#5-compliance-impact)

---

## 1. Overview

The AIDD workflow has 6 phases: Brainstorm, Plan, Execute, Test, Review, Ship. For trivial tasks (typo fixes, config changes, single-file edits), the full ceremony adds overhead without proportional value. Fast-track allows skipping phases while maintaining traceability.

Two mechanisms:
- **`fastTrack: boolean`** — global toggle, skips default phases
- **`skippableStages: string[]`** — explicit per-phase control, overrides fastTrack

---

## 2. Classification

### Auto-Suggest (AI behavior)

When classifying a task during `aidd_start`, if the AI determines complexity is `trivial`:
- Set `taskClassification.fastTrack: true`
- Set `taskClassification.skippableStages: ['brainstorm', 'plan', 'checklist']`
- Inform the user of the classification

Trivial indicators:
- Fewer than 3 implementation steps
- Single file affected
- No architectural decisions required
- Bug fix with known root cause
- Config/typo/formatting change

### User Override

Users can override in either direction:
- "No, this needs full workflow" → `fastTrack: false, skippableStages: []`
- "Skip brainstorm only" → `skippableStages: ['brainstorm']`
- "Skip everything" → `skippableStages: ['brainstorm', 'plan', 'checklist', 'retro']`

---

## 3. Skip Semantics

### Resolution Priority

1. If `skippableStages` is provided and non-empty → use it as-is
2. If `fastTrack === true` and no `skippableStages` → default to `['brainstorm', 'plan', 'checklist']`
3. Otherwise → no phases skipped (full workflow)

### Default Fast-Track Skip

| Phase | Default Skip | Artifact |
|-------|-------------|----------|
| Brainstorm | Yes | brainstorm |
| Plan | Yes | plan |
| Execute | No (always required) | — |
| Test | Yes | checklist |
| Review | No (always required) | — |
| Ship | No (retro always required) | retro |

### Skippable Phases

All phases are skippable. The compliance score reflects what was completed versus what was required, but no phase is forced. Users who skip retro will see lower compliance scores.

### Hook Enforcement

`pre-edit.cjs` respects `skippableStages`:
- Gate 1 (brainstorm): skipped if `'brainstorm'` in skip list
- Gate 2 (plan): skipped if `'plan'` in skip list

---

## 4. Escalation

If during analysis the AI discovers the task is more complex than initially classified:

1. Update session: `aidd_session { action: "update", taskClassification: { complexity: "moderate", fastTrack: false, skippableStages: [] } }`
2. Inform the user: "Complexity upgraded — switching to full workflow."
3. Resume from UNDERSTAND phase (create brainstorm artifact)

Escalation triggers:
- Multiple files need modification
- Architectural decisions required
- Dependencies or breaking changes discovered
- User adds requirements mid-task

---

## 5. Compliance Impact

Compliance score is computed from required artifacts only. Skipped phases are excluded from the requirement set:

- Full workflow (4 required): brainstorm, plan, checklist, retro
- Fast-track default (1 required): retro
- Custom skip: `REQUIRED_DEFAULT.filter(p => !skippableStages.includes(p))`

Skipped phases show as "Skipped (Fast-Track)" in the hub phase stepper, not "Missing".
