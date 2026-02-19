---
name: planning
description: Produces atomic, idempotent plan documents with ADRs, diagrams, and issue tracking
complexity: medium
estimated_duration: 45 minutes
skills_required:
  - system-architect
  - knowledge-architect
model_strategy: sequential
---

# Workflow: Planning (Plan Creation & Commitment)

> Atomic, idempotent, executable plan documents — version-controlled before any implementation begins.

## Purpose

Create executable plan documents from brainstorm or research findings. Produces ADR, plan document, architecture diagram, and GitHub issue. Ensures version-controlled spec commitment before any implementation begins.

**Use when:**

- Creating executable plans from brainstorm or research findings
- Need version-controlled specs before implementation
- Defining architecture decisions and implementation steps with tier assignments
- Preparing structured documents for team review

## Invocation

| Type       | Items                             |
| ---------- | --------------------------------- |
| **Skills** | system-architect, knowledge-architect |
| **MCPs**   | Context7                          |

---

## Prerequisites

- [ ] Brainstorm Summary or Research Summary exists (from `workflows/brainstorming.md` or `templates/research.md`)
- [ ] Clear requirements available (what, why, who, constraints, scope)
- [ ] Relevant codebase context loaded (architecture, existing patterns, dependencies)

---

## Step 1: Create Plan Document

**Indicator**: `[aidd.md] Workflow - planning (Create Plan Document)`

**Input:** Brainstorm Summary + Research Summary (or clear requirements).

**Output:** Four documents at `docs/plans/active/<YYYY.MM.DD>-<feature>-*.md`:

1. **ADR Document** — `<YYYY.MM.DD>-<feature>-adr.md`
2. **Plan Document** — `<YYYY.MM.DD>-<feature>-plan.md`
3. **Diagram Document** — `<YYYY.MM.DD>-<feature>-diagram.md`
4. **Issue Document** — `<YYYY.MM.DD>-<feature>-issue.md`

**Reference:** `specs/aidd-lifecycle.md` — Phases 1-2 (UNDERSTAND, PLAN)

### Plan Document Contents

The plan document must include:

- **Context** — Problem statement, research reference, why this matters now
- **Acceptance Criteria** — Given/When/Then format, testable and specific
- **Architecture Decisions** — Key technical choices with rationale (reference ADR)
- **Implementation Steps** — Atomic tasks with:
  - Task description
  - Files to create/modify
  - Tier assignment (1=architecture, 2=implementation, 3=tests/boilerplate)
  - Dependencies on other tasks
- **Testing Strategy** — Unit, integration, e2e scope
- **Risks** — Known risks with probability, impact, and mitigation

### ADR Document Format

```markdown
# ADR-XXX: [Decision Title]

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
Why this decision is needed.

## Decision
What was decided.

## Consequences
- Positive: [benefits]
- Negative: [trade-offs accepted]
- Risks: [what could go wrong]
```

### Diagram Document

Generate architecture diagrams using Mermaid C4 syntax:

```mermaid
C4Container
title [Feature Name] - Container View
...
```

### Issue Document

Structured GitHub issue with labels, acceptance criteria, and implementation checklist.

---

## Step 2: Plan Review Gate

**Indicator**: `[aidd.md] Workflow - planning (Plan Review)`

Present the plan to the user for review.

**Gate:** User reviews plan → `[Approve]` | `[Revise]` | `[Reject & Re-brainstorm]`

- **Approve** — Proceed to Step 3 (Commit Plan)
- **Revise** — Update plan based on feedback, re-present
- **Reject & Re-brainstorm** — Return to `workflows/brainstorming.md`

---

## Step 3: Commit Plan

**Indicator**: `[aidd.md] Workflow - planning (Commit Plan)`

**Tier:** 3 (subagent — well-defined task)

**Reference:** `specs/aidd-lifecycle.md` — Phase 3 (SPEC)

Steps:
1. **Check current branch** — Suggest `feature/<name>` or `fix/<name>` if on `main`
2. **Commit plan + issue docs** separately from implementation: `docs(scope): add plan for <feature>`
3. **Confirm commit succeeded**

The plan must be version-controlled BEFORE any implementation begins. This ensures:
- Clear audit trail of what was planned vs what was built
- Ability to review plan divergence during implementation
- Rollback point if implementation needs to restart

---

## Artifacts Produced

| Artifact         | Step | Location                                                 |
| ---------------- | ---- | -------------------------------------------------------- |
| ADR Document     | 1    | `docs/plans/active/<YYYY.MM.DD>-<feature>-adr.md`       |
| Plan Document    | 1    | `docs/plans/active/<YYYY.MM.DD>-<feature>-plan.md`      |
| Diagram Document | 1    | `docs/plans/active/<YYYY.MM.DD>-<feature>-diagram.md`   |
| Issue Document   | 1    | `docs/plans/active/<YYYY.MM.DD>-<feature>-issue.md`     |
| Spec Commit      | 3    | Git history                                              |

---

## Success Criteria

- [ ] Plan covers all acceptance criteria from brainstorm/research
- [ ] Architecture decisions documented in ADR with rationale
- [ ] Each implementation task has a tier assignment
- [ ] Dependencies between tasks are mapped
- [ ] Testing strategy covers acceptance criteria
- [ ] Risks identified with mitigations
- [ ] User approved the plan
- [ ] Plan committed to version control before implementation

---

## Anti-Patterns

| Anti-Pattern                | Description                                                    | Mitigation                                                       |
| --------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Implementing Before Plan** | Starting code before committing the plan                      | Enforce Step 3 (Commit Plan) as mandatory gate                   |
| **Vague Acceptance Criteria** | "It should work" instead of Given/When/Then                  | Require testable, specific criteria for every requirement        |
| **Missing Tier Assignments** | No model tier specified per task                              | Every implementation step must have a tier column                |
| **Monolithic Plan**          | One giant task instead of atomic steps                        | Break into tasks that can be independently verified              |
| **Plan-Reality Divergence**  | Plan says X, implementation does Y, plan not updated          | If divergence occurs: update plan FIRST, then continue           |
| **Skipping Review Gate**     | Auto-approving without user input                             | Gate is mandatory — user must explicitly choose                  |

---

## Cross-References

- **Previous phase (Brainstorm)**: `workflows/brainstorming.md`
- **Previous phase (Research)**: `templates/research.md`
- **Next phase (Execute)**: `workflows/executing.md`
- **Orchestration pipeline**: `workflows/orchestrator.md`
- **AIDD lifecycle**: `specs/aidd-lifecycle.md`
- **Model tier assignments**: `specs/model-matrix.md`
- **System Architect skill**: `skills/system-architect/SKILL.md`
- **Knowledge Architect skill**: `skills/knowledge-architect/SKILL.md`
