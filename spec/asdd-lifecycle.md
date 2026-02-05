# AI-Spec-Driven Development — 8-Phase Lifecycle

> Structured development lifecycle where every feature flows through specification before implementation.

**Last Updated**: 2026-02-04
**Status**: Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Phase Definitions](#2-phase-definitions)
3. [Tier Transitions](#3-tier-transitions)
4. [Quality Gates](#4-quality-gates)
5. [Workflow Diagram](#5-workflow-diagram)

---

## 1. Overview

ASDD (AI-Spec-Driven Development) enforces a disciplined path from requirement to deployment. Every feature passes through 8 sequential phases, each with explicit entry criteria, deliverables, and exit criteria. The lifecycle prevents specification drift, ensures traceability, and separates planning effort from execution effort.

Core principle: **specification and implementation are separate commits**. The spec is a first-class artifact, not an afterthought.

---

## 2. Phase Definitions

### PHASE 1 — SYNC

**Objective**: Achieve full situational awareness of the project state.

- Read project AGENTS.md (if present) as the source of truth for agent configuration.
- Scan `docs/`, `ai/memory/`, and project-specific configuration files.
- Analyze codebase: directory structure, naming conventions, active patterns.
- Identify relevant domain concepts, existing abstractions, and dependency graph.
- Consult `memory/decisions.json` and `memory/conventions.json` if they exist.

**Exit criteria**: Sufficient context to articulate the feature in domain terms without ambiguity.

### PHASE 2 — STORY

**Objective**: Define the feature from the user's perspective with testable acceptance criteria.

- Write a user story: `As a [user], I want [goal], so that [benefit]`.
- Define acceptance criteria using Given/When/Then format.
- Identify edge cases, error states, and boundary conditions.
- If confidence in requirements is below 90%, ask clarifying questions before proceeding.

**Exit criteria**: User story and acceptance criteria are unambiguous and agreed upon.

### PHASE 3 — PLAN

**Objective**: Decompose the feature into atomic, trackable tasks.

- List every file to create or modify.
- Assign complexity per task: Low (< 15 min), Medium (15-60 min), High (> 60 min).
- Order tasks by dependency (what must exist before what).
- Use task tracking tools for all non-trivial plans.
- Check codebase for similar features that can be referenced or reused.

**Exit criteria**: Complete task list with file paths, complexity ratings, and dependency order.

### PHASE 4 — COMMIT_SPEC

**Objective**: Persist the specification as a versioned artifact.

- Write spec document in `docs/plans/active/` or `docs/specs/`.
- Include: user story, acceptance criteria, task breakdown, architecture notes.
- Commit separately from implementation: `docs(scope): add spec for [feature]`.
- The spec is now the contract. Implementation must satisfy it.

**Exit criteria**: Spec committed to version control. No implementation code in this commit.

### PHASE 5 — EXECUTE

**Objective**: Implement the feature by following the plan strictly.

- Mark each task as `in_progress` before starting, `completed` when done.
- Only one task should be `in_progress` at any time.
- Think from relevant sub-agent perspectives (e.g., Frontend: Engineer + UX Lead; Backend: Architect + Engineer).
- If implementation diverges from spec, update the spec first, then continue.
- Run targeted tests after each meaningful change.

**Exit criteria**: All planned tasks completed. No untracked changes.

### PHASE 6 — TEST

**Objective**: Verify the implementation satisfies all acceptance criteria.

- Write or update test files matching the Given/When/Then criteria from Phase 2.
- Target specific test files only (not the full suite during development).
- Cover edge cases and error states identified in Phase 2.
- Mock external dependencies using port/adapter boundaries.

**Exit criteria**: All acceptance criteria have corresponding passing tests.

### PHASE 7 — VERIFY

**Objective**: Confirm the implementation is production-ready.

- Run `typecheck` to ensure zero TypeScript errors.
- Run `lint` to enforce code style.
- Run targeted tests to confirm all pass.
- Confirm spec matches final implementation (update spec if diverged).
- Review for dead code, magic strings, and missing error handling.

**Exit criteria**: Clean typecheck, clean lint, all targeted tests pass, spec is current.

### PHASE 8 — COMMIT_IMPL

**Objective**: Create the implementation commit with full verification.

- Run full check suite: `typecheck + lint + test + build`.
- Commit with conventional format: `feat(scope): [description]` or `fix(scope): [description]`.
- Update `memory/decisions.json` if significant architectural decisions were made.
- Move spec from `docs/plans/active/` to `docs/plans/done/` (date-prefixed) if the feature is complete.

**Exit criteria**: Clean commit, all checks pass, memory updated.

---

## 3. Tier Transitions

The lifecycle maps to intelligence tiers to optimize effort allocation:

| Phases | Tier | Effort | Rationale |
|--------|------|--------|-----------|
| SYNC, STORY, PLAN, COMMIT_SPEC | Tier 1 (HIGH) | Architecture, analysis, planning | Errors here cascade. Maximum rigor required. |
| EXECUTE | Tier 2 (STANDARD) | Implementation, integration | Follow the plan. Creativity within constraints. |
| TEST, VERIFY, COMMIT_IMPL | Tier 3 (LOW) | Tests, validation, formatting | Mechanical verification. Low ambiguity. |

Tier transitions are not rigid. If execution reveals architectural issues, escalate back to Tier 1 for re-planning.

---

## 4. Quality Gates

Before marking a feature as complete, verify every item:

- [ ] All acceptance criteria from Phase 2 are met
- [ ] TypeScript compiles with zero errors (`--noEmit`)
- [ ] Linter passes with zero warnings
- [ ] All targeted tests pass
- [ ] No dead code or commented-out blocks
- [ ] No magic strings or numbers (extracted to constants)
- [ ] Spec document matches the final implementation
- [ ] Conventional commit format used
- [ ] Spec commit is separate from implementation commit
- [ ] Memory files updated if significant decisions were made

---

## 5. Workflow Diagram

```
SYNC --> STORY --> PLAN --> COMMIT_SPEC --> EXECUTE --> TEST --> VERIFY --> COMMIT_IMPL
 ^                                            |
 |                                            |
 +-------- (divergence detected) <------------+
```

If at any point the implementation diverges from the spec, the workflow loops back: update the spec first, then resume execution. The spec is always the source of truth.
