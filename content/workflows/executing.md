---
name: executing
description: Implements approved plans with adaptive model assignment, parallel dispatch, and verification
complexity: high
estimated_duration: 60 minutes
skills_required:
  - system-architect
  - quality-engineer
  - knowledge-architect
model_strategy: hybrid
---

# Workflow: Executing (Plan Implementation & Completion)

> Execute approved plans with adaptive per-task model assignment, parallel dispatch, verification, and clean completion.

## Purpose

Implement an approved, committed plan with per-task model assignment, parallel dispatch for independent tasks, verification at each step, and clean completion with plan archival.

**Use when:**

- An approved plan exists and is committed to version control
- Ready to build from a structured implementation roadmap
- Need adaptive model tier assignment per task
- Require parallel dispatch for independent tasks

## Invocation

| Type       | Items                                           |
| ---------- | ----------------------------------------------- |
| **Skills** | quality-engineer, system-architect              |
| **MCPs**   | Context7, WebSearch                             |

---

## Prerequisites

- [ ] Approved plan exists and is committed to version control
- [ ] Plan has tier assignments per task
- [ ] Dependencies between tasks are mapped
- [ ] Branch created (`feature/<name>` or `fix/<name>`)

---

## Step 1: Dispatch Strategy

**Indicator**: `[aidd.md] Workflow - executing (Dispatch Strategy)`

**Reference:** `specs/model-matrix.md` — Parallel Dispatch Pattern

Analyze the plan's task list and create an execution strategy:

1. **Assign model per the plan's Tier column**
   - Tier 1: Architecture, security, complex analysis
   - Tier 2: Implementation, integration, API design
   - Tier 3: Tests, boilerplate, formatting, config
2. **Group independent tasks by tier** — Launch parallel subagents for tasks with no dependencies
3. **Sequential execution for dependent tasks** — Respect dependency ordering
4. **Escalation strategy** — If a task fails at its assigned tier, retry one tier higher

---

## Step 2: Implementation

**Indicator**: `[aidd.md] Workflow - executing (Implementation)`

Execute the plan task by task:

- Follow the plan's task list strictly
- Mark each task as completed upon finishing
- If plan diverges from reality: **update plan FIRST**, then continue
- If blocked: **stop**, document blocker, ask user before proceeding

### Failure Handling

| Scenario                  | Action                                              |
| ------------------------- | --------------------------------------------------- |
| Task fails at assigned tier | Escalate to next tier higher and retry             |
| Plan diverges from reality  | Update plan document FIRST, then continue          |
| Blocked by dependency       | Stop, document blocker, ask user                   |
| Subagent failure            | Escalate to next model tier and retry              |
| Critical failure            | Stop orchestration, alert user                     |

---

## Step 3: Verification

**Indicator**: `[aidd.md] Workflow - executing (Verification)`

Task-to-tier assignment for verification:

| Verification Task          | Tier |
| -------------------------- | ---- |
| Run typecheck/lint/tests   | 3    |
| Analyze failures           | 2→1 (escalate) |
| Draft commit/PR            | 2    |
| Final architecture review  | 1    |

### Completion Checklist

- [ ] All acceptance criteria from the plan are met
- [ ] `typecheck` clean
- [ ] `lint` clean
- [ ] Tests passing
- [ ] No dead code
- [ ] Plan status updated to Complete
- [ ] Implementation commit: `feat(scope): implement <feature>`

---

## Step 4: Plan Archival

**Indicator**: `[aidd.md] Workflow - executing (Plan Archival)`

1. Move plan: `docs/plans/active/` → `docs/plans/done/`
2. Update any cross-references to the plan location
3. Ask user: `[Create PR]` | `[Merge to main]` | `[Leave on branch]`

---

## Artifacts Produced

| Artifact              | Step | Location                        |
| --------------------- | ---- | ------------------------------- |
| Implementation        | 2    | Source files per plan            |
| Implementation Commit | 3    | Git history                     |
| Archived Plan         | 4    | `docs/plans/done/<feature>-*`   |

---

## Success Criteria

- [ ] User's original intent is fully addressed
- [ ] All acceptance criteria from the plan are met
- [ ] TypeScript clean, lint clean, tests passing
- [ ] No dead code introduced
- [ ] Plan archived from active to done
- [ ] Model usage is cost-efficient (minimum tier per task)
- [ ] No content duplication

---

## Anti-Patterns

| Anti-Pattern                | Description                                                    | Mitigation                                                       |
| --------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Executing Without Plan**   | Building without a committed plan                             | Plan must be committed before execution starts                   |
| **Ignoring Tier Assignments**| Running everything at Tier 1 regardless of complexity         | Follow the plan's tier column; only escalate on failure          |
| **Skipping Verification**    | Not running typecheck/lint/tests after implementation         | Verification is mandatory before completion                      |
| **Plan Divergence Silence**  | Implementation differs from plan without updating it          | If divergence occurs: update plan FIRST, then continue           |
| **Brute-Force Debugging**    | Retrying the same failing approach repeatedly                 | Escalate tier, consider alternative approach, ask user           |
| **Skipping Archival**        | Leaving plan in active/ after completion                      | Plan archival is a mandatory final step                          |

---

## Cost Estimation

| Tier       | Stages                                          | Est. Tokens        | Cost                | Total      |
| ---------- | ----------------------------------------------- | ------------------ | ------------------- | ---------- |
| **Tier 1** | Architecture review, failure analysis           | ~10,000            | See model-matrix.md | ~$0.15     |
| **Tier 2** | Implementation, commit/PR drafting              | ~25,000            | See model-matrix.md | ~$0.08     |
| **Tier 3** | Typecheck, lint, tests, boilerplate             | ~15,000            | See model-matrix.md | ~$0.02     |
| **Total**  | **Adaptive**                                    | **~50,000 tokens** | **Mixed**           | **~$0.25** |

Costs vary based on plan complexity and number of tasks.

---

## Cross-References

- **Previous phase (Plan)**: `workflows/planning.md`
- **Orchestration pipeline**: `workflows/orchestrator.md`
- **AIDD lifecycle**: `specs/aidd-lifecycle.md` — Phases 4-6 (BUILD, VERIFY, SHIP)
- **Model tier assignments**: `specs/model-matrix.md`
- **Parallel dispatch pattern**: `specs/model-matrix.md` — Parallel Dispatch Pattern
- **Quality Engineer skill**: `skills/quality-engineer/SKILL.md`
- **System Architect skill**: `skills/system-architect/SKILL.md`
