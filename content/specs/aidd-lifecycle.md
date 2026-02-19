# AI-Driven Development — 6-Phase Lifecycle

> Structured development lifecycle where every feature flows through specification before implementation.

**Last Updated**: 2026-02-18
**Status**: Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Phase Definitions](#2-phase-definitions)
3. [Tier Transitions](#3-tier-transitions)
4. [Dispatch Strategy](#4-dispatch-strategy)
5. [Quality Gates](#5-quality-gates)
6. [Workflow Diagram](#6-workflow-diagram)

---

## 1. Overview

AIDD (AI-Driven Development) enforces a disciplined path from requirement to deployment. Every feature passes through 6 sequential phases, each with explicit entry criteria, deliverables, and exit criteria. The lifecycle prevents specification drift, ensures traceability, and separates planning effort from execution effort.

The 6-phase model consolidates the original 8 phases into a tighter loop: comprehension and requirements merge into a single pass (UNDERSTAND), task decomposition absorbs issue tracking (PLAN), testing and verification run as one sweep (VERIFY), and shipping handles all post-implementation housekeeping (SHIP).

Core principle: **specification and implementation are separate commits**. The spec is a first-class artifact, not an afterthought.

---

## 2. Phase Definitions

### PHASE 1 — UNDERSTAND

**Indicator**: `[aidd.md] Phase - Entered UNDERSTAND`
**Tier**: 1 (HIGH)
**Objective**: Achieve full situational awareness and define the feature with testable acceptance criteria in one pass.

- Read project AGENTS.md (if present) as the source of truth for agent configuration.
- Scan `docs/`, `.aidd/memory/`, and project-specific configuration files.
- Analyze codebase: directory structure, naming conventions, active patterns.
- Identify relevant domain concepts, existing abstractions, and dependency graph.
- Consult `memory/decisions.json` and `memory/conventions.json` if they exist.
- Write a user story: `As a [user], I want [goal], so that [benefit]`.
- Define acceptance criteria using Given/When/Then format.
- Identify edge cases, error states, and boundary conditions.
- If confidence in requirements is below 90%, ask clarifying questions before proceeding.

**Gate**: `[Requirements Clear]` | `[Need More Info]`

**Exit criteria**: Sufficient context to articulate the feature in domain terms without ambiguity. User story and acceptance criteria are unambiguous and agreed upon.

### PHASE 2 — PLAN

**Indicator**: `[aidd.md] Phase - Entered PLAN`
**Tier**: 1 (HIGH)
**Objective**: Decompose the feature into atomic, trackable tasks with tier assignments and architecture decisions.

- List every file to create or modify.
- Assign complexity per task: Low (< 15 min), Medium (15-60 min), High (> 60 min).
- Assign a model tier per task (see `specs/model-matrix.md` for tier definitions).
- Order tasks by dependency (what must exist before what).
- Use task tracking tools for all non-trivial plans.
- Check codebase for similar features that can be referenced or reused.
- Document architecture decisions that affect the implementation approach.

#### Plan Document Structure

Each implementation step MUST include a model assignment column:

| #   | Task          | Files     | Complexity | Tier | Status  |
| --- | ------------- | --------- | ---------- | ---- | ------- |
| 1   | [Atomic task] | `src/...` | High       | 1    | pending |
| 2   | [Atomic task] | `src/...` | Standard   | 2    | pending |
| 3   | [Atomic task] | `src/...` | Low        | 3    | pending |

#### File Convention

| Scope              | Path                                                                       |
| ------------------ | -------------------------------------------------------------------------- |
| ADR                | `docs/plans/active/<YYYY.MM.DD>-<feature>-adr.md`                          |
| Single feature     | `docs/plans/active/<YYYY.MM.DD>-<feature>-plan.md`                         |
| Multi-part feature | `docs/plans/active/<YYYY.MM.DD>-01-<feature-part-a>-plan.md`, `...-02-...` |
| Related issue      | `docs/plans/active/<YYYY.MM.DD>-<feature>-issue.md`                        |

#### Issue Tracking (when applicable)

When the task involves a bug report or tracked problem, create a structured issue document as part of the plan:

- Create `docs/plans/active/<YYYY.MM.DD>-<feature>-issue.md` with:
  - Problem description and reproduction steps (if bug)
  - Linked plan document (if one exists)
  - GitHub issue body (ready to push via `gh`)
- Link the issue to the relevant plan document if both exist.

**Gate**: User reviews plan. `[Approve]` | `[Revise]` | `[Re-brainstorm]`

**Exit criteria**: Complete task list with file paths, complexity ratings, model assignments, dependency order, and linked issues (if applicable).

### PHASE 3 — SPEC

**Indicator**: `[aidd.md] Phase - Entered SPEC`
**Tier**: 3 (LOW)
**Objective**: Persist the specification as a versioned artifact.

- Check current branch — suggest `feature/<name>` or `fix/<name>` if on `main`.
- Write spec document in `docs/plans/active/` or `docs/specs/`.
- Include: user story, acceptance criteria, task breakdown with tier assignments, architecture notes.
- Commit separately from implementation: `docs(scope): add spec for [feature]`.
- The spec is now the contract. Implementation must satisfy it.

**Skippable**: For trivial changes (single-file edits, typo fixes, minor refactors), this phase can be skipped with explicit user confirmation. The plan from Phase 2 serves as the lightweight contract in those cases.

**Model guidance**: This is a mechanical task (Tier 3). Can be delegated to a Tier 3 subagent.

**Exit criteria**: Spec committed to version control. No implementation code in this commit.

### PHASE 4 — BUILD

**Indicator**: `[aidd.md] Phase - Entered BUILD`
**Tier**: 2 (STANDARD)
**Objective**: Implement the feature by following the plan strictly.

- Mark each task as `in_progress` before starting, `completed` when done.
- Only one task should be `in_progress` at any time (for the orchestrator's tracking).
- Think from relevant sub-agent perspectives (e.g., Frontend: Engineer + UX Lead; Backend: Architect + Engineer).
- If implementation diverges from spec, update the spec first, then continue.
- If blocked, stop, document the blocker, and ask the user.
- Run targeted tests after each meaningful change.

#### Dispatch Strategy

Assign model tier per-task using the plan's Tier column (see `specs/model-matrix.md` for adaptive assignments):

- Group independent tasks by model tier.
- Launch parallel subagents where no dependencies exist.
- Sequential execution for dependent tasks.
- If subagent output fails verification: escalate to next model tier and retry.

```
Example — Plan has 6 steps:

  Step 1: Define entities        (High, Tier 1)   ─┐
  Step 2: Create migration       (Std, Tier 2)     ├─ parallel (no deps)
  Step 3: Barrel exports         (Low, Tier 3)   ─┘
  Step 4: Implement use case     (High, Tier 1)   ← depends on Step 1
  Step 5: Add API endpoint       (Std, Tier 2)    ← depends on Step 4
  Step 6: Write unit tests       (Low, Tier 3)    ← depends on Step 4

Execution:
  Round 1: [T1:Step1] + [T2:Step2] + [T3:Step3]  (parallel)
  Round 2: [T1:Step4]                               (sequential)
  Round 3: [T2:Step5] + [T3:Step6]                  (parallel)
```

**Gate**: `[Continue]` | `[Pause & Reassess]` (on divergence or blocker)

**Exit criteria**: All planned tasks completed. No untracked changes.

### PHASE 5 — VERIFY

**Indicator**: `[aidd.md] Phase - Entered VERIFY`
**Tier**: 3 to 2 (ADAPTIVE)
**Objective**: Single comprehensive verification pass — write tests, run checks, confirm spec alignment.

- Write or update test files matching the Given/When/Then criteria from Phase 1.
- Cover edge cases and error states identified in Phase 1.
- Mock external dependencies using port/adapter boundaries.
- Run `typecheck` to ensure zero TypeScript errors.
- Run `lint` to enforce code style.
- Run targeted tests to confirm all pass.
- Confirm spec matches final implementation (update spec if diverged).
- Review for dead code, magic strings, commented-out blocks, and missing error handling.

#### Completion Task-to-Model Assignment

| Task                          | Tier  | Rationale                                          |
| ----------------------------- | ----- | -------------------------------------------------- |
| Run typecheck/lint            | 3     | Mechanical — run command, report result            |
| Run test suite                | 3     | Mechanical — run command, report result            |
| Analyze test failures         | 2 → 1 | Depends on failure complexity; escalate if needed  |
| Write missing tests (simple)  | 3     | Pure functions, no mocks, obvious assertions       |
| Write missing tests (complex) | 2 → 1 | Integration tests, mocked boundaries, edge cases   |
| Update plan status            | 3     | File edit — mechanical                             |
| Move plan to `done/`          | 3     | File operation — mechanical                        |
| Draft commit message          | 2     | Needs to summarize changes accurately              |
| Create PR                     | 2     | Needs coherent summary and test plan               |
| Final architecture review     | 1     | Verify implementation matches architectural intent |

**Gate**: `[All Pass]` | `[Fix & Re-verify]`

**Exit criteria**: Clean typecheck, clean lint, all targeted tests pass, spec is current, no dead code.

### PHASE 6 — SHIP

**Indicator**: `[aidd.md] Phase - Entered SHIP`
**Tier**: 3 (LOW)
**Objective**: Create the implementation commit, produce implementation summary, update memory, archive the plan, and optionally open a PR.

- Run full check suite: `typecheck + lint + test + build`.
- Commit with conventional format: `feat(scope): [description]` or `fix(scope): [description]`.
- **MUST** produce an Implementation Summary (see `specs/implementation-summary.md`).
- Update `memory/decisions.json` if significant architectural decisions were made.
- Move plan from `docs/plans/active/` to `docs/plans/done/` (date-prefixed) if the feature is complete.
- Create a pull request if working on a feature branch (optional, user-directed).
- Verify all required deliverables are produced (see `rules/deliverables.md`).

**Gate**: `[Commit]` | `[Create PR]` | `[Leave on Branch]`

**Exit criteria**: Clean commit, all checks pass, implementation summary produced, memory updated, plan archived.

---

## 3. Tier Transitions

The lifecycle maps to intelligence tiers to optimize effort allocation:

| Phase      | Tier                  | Effort                        | Rationale                                       |
| ---------- | --------------------- | ----------------------------- | ----------------------------------------------- |
| UNDERSTAND | Tier 1 (HIGH)         | Analysis, comprehension       | Errors here cascade. Maximum rigor required.    |
| PLAN       | Tier 1 (HIGH)         | Architecture, decomposition   | Structural decisions define implementation.     |
| SPEC       | Tier 3 (LOW)          | Mechanical commit             | Formatting and committing — low ambiguity.      |
| BUILD      | Tier 2 (STANDARD)     | Implementation, integration   | Follow the plan. Creativity within constraints. |
| VERIFY     | Tier 3 → 2 (ADAPTIVE) | Tests, validation, review     | Starts mechanical; escalates on failures.       |
| SHIP       | Tier 3 (LOW)          | Commit, archival, PR creation | Mechanical finalization. Low ambiguity.         |

Tier transitions are not rigid. If BUILD reveals architectural issues, escalate back to Tier 1 for re-planning. If VERIFY uncovers complex test failures, escalate from Tier 3 to Tier 2 or Tier 1.

---

## 4. Dispatch Strategy

Model selection during execution is **per-task**, not per-phase. The orchestrator evaluates each implementation step and assigns the optimal model tier. See `specs/model-matrix.md` for the full adaptive task assignment rules.

### Principles

1. **Use the minimum tier that produces correct output** — never overspend on boilerplate.
2. **Escalate on failure** — if a subagent fails or produces incorrect output, retry one tier higher.
3. **Escalate on ambiguity** — unclear requirements or multiple valid approaches -> Tier 1.
4. **Escalate on security** — auth, crypto, user input, external APIs -> minimum Tier 2, prefer Tier 1.
5. **Escalate on dependency** — if a task blocks multiple downstream tasks -> one tier higher.
6. **User override** — user can always request a specific model tier for any task.

### Parallel Execution

Independent tasks dispatch simultaneously at their assigned tiers. The orchestrator manages dependency ordering: independent tasks run in parallel, dependent tasks wait for their prerequisites.

---

## 5. Quality Gates

Before marking a feature as complete, verify every item:

- [ ] All acceptance criteria from UNDERSTAND are met
- [ ] TypeScript compiles with zero errors (`--noEmit`)
- [ ] Linter passes with zero warnings
- [ ] All targeted tests pass
- [ ] No dead code or commented-out blocks
- [ ] No magic strings or numbers (extracted to constants)
- [ ] Spec document matches the final implementation
- [ ] Conventional commit format used
- [ ] Spec commit is separate from implementation commit
- [ ] Memory files updated if significant decisions were made
- [ ] Model usage is cost-efficient (minimum tier that produces correct output)
- [ ] Plan archived from `active/` to `done/` (if feature is complete)

---

## 6. Workflow Diagram

```
UNDERSTAND --> PLAN --> SPEC --> BUILD --> VERIFY --> SHIP
     ^                           |
     |                           |
     +--- (divergence) ---------+
```

If at any point the implementation diverges from the spec, the workflow loops back: update the spec first, then resume from BUILD. The spec is always the source of truth.

---

## Cross-References

- **Orchestration pipeline**: `workflows/orchestrator.md`
- **Brainstorming**: `workflows/brainstorming.md` (AIDD) or `templates/brainstorming.md` (fallback)
- **Research (pre-AIDD)**: `templates/research.md`
- **Model tier assignments**: `specs/model-matrix.md`
- **Task routing**: `templates/routing.md`
- **Orchestrator rules**: `rules/orchestrator.md`
- **BLUF-6 output format**: `specs/bluf-6.md`
- **Memory layer**: `specs/memory-layer.md`
