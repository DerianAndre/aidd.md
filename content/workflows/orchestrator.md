---
name: orchestrator
description: Systematic ideation-to-execution pipeline with adaptive model selection, phase gates, and parallel dispatch
complexity: high
estimated_duration: 120 minutes
skills_required:
  - system-architect
  - knowledge-architect
  - quality-engineer
model_strategy: hybrid
---

# AIDD Orchestrator

## Purpose

Coordinate the full brainstorm → research → plan → execute → complete pipeline for features that start as vague ideas and need structured progression through evidence-gathering, architecture decisions, and implementation. This orchestrator ensures no phase is skipped, each transition has a user decision gate, and model selection is optimized per-task.

**Use when:**

- Building a new feature from a vague or partially-formed idea
- The user needs brainstorming before planning
- Research is required to validate an approach
- A structured pipeline from ideation to deployment is needed

**Invocation:**

- Skills: `/superpowers:brainstorming` → `/superpowers:writing-plans` → `/superpowers:executing-plans`
- Specialized: `/clean-ddd-hexagonal` (when DDD/Hexagonal patterns detected)
- MCPs: Context7 (docs lookup), WebSearch (trend/tech research), project-relevant MCPs

---

## Workflow Stages

### Stage 0: Intake (Tier 1 — inline)

**Indicator**: `[aidd.md] Workflows: Orchestrator - Architect Mode → <entry point>`
**Task:** Classify the user's request to determine the optimal entry point.
**Input:** User's initial request.
**Output:** Entry point classification.
**Reference:** `rules/orchestrator.md` → Section 4 (Intake Classification)

| Signal                              | Entry Point            |
| ----------------------------------- | ---------------------- |
| Vague idea, "I want to build..."    | → Stage 1 (Brainstorm) |
| Clear feature, needs research       | → Stage 2 (Research)   |
| Defined requirements, ready to plan | → Stage 3 (Plan)       |
| Existing plan, ready to build       | → Stage 5 (Execute)    |
| Bug report or issue                 | → Stage 3B (Issue)     |

**Default:** Enter at Stage 1 unless the user demonstrates clarity.

---

### Stage 1: Brainstorm (Tier 1 — inline)

**Indicator**: `[aidd.md] Workflow - orchestrator (Brainstorm)`
**Task:** Extract what the user actually needs through structured questioning.
**Input:** User's initial request + intake classification.
**Output:** Brainstorm Summary artifact.
**Reference:** `templates/brainstorming.md`
**Model:** Orchestrator (Tier 1) inline. Do NOT delegate to subagents — requires conversational continuity.

Protocol:
1. Listen → Probe → Mirror → Challenge → Converge (Step 0 from brainstorming template)
2. Define Problem Space → Diverge → Analyze → Converge → Document (Steps 1-5)

**Gate:** User chooses → `[Keep Brainstorming]` | `[Move to Research]` | `[Move to Plan]` | `[Accept & Execute]`

---

### Stage 2: Research (Tier 2 subagents + Tier 1 synthesis)

**Indicator**: `[aidd.md] Workflow - orchestrator (Research)`
**Task:** Ground decisions in evidence through parallel multi-source investigation.
**Input:** Brainstorm Summary or clear feature description.
**Output:** Research Summary with trade-off matrix.
**Reference:** `templates/research.md`
**Model:** Dispatch Tier 2 subagents in parallel for:
  - Technology scan (competing implementations, OSS projects)
  - Framework best practices (verified against detected versions)
  - Trend validation (ecosystem direction, deprecation timelines)
  - Risk identification (known pitfalls, breaking changes)

Tier 1 orchestrator synthesizes findings into a trade-off matrix.

**Gate:** User chooses approach from trade-off matrix → proceed to Plan.

---

### Stage 3: Plan (Tier 1 — inline)

**Indicator**: `[aidd.md] Workflow - orchestrator (Plan)`
**Task:** Produce an atomic, idempotent, executable plan document.
**Input:** Brainstorm Summary + Research Summary (or just clear requirements).
**Output:** Plan document at `docs/plans/active/<YYYY-MM-DD>-<feature>.md`.
**Reference:** `specs/aidd-lifecycle.md` → Phases 1-2 (UNDERSTAND, PLAN)

The plan document includes:
- Context (problem statement, research reference)
- Acceptance criteria (Given/When/Then)
- Architecture decisions
- Implementation steps with tier assignment column
- Testing strategy
- Risks

**Gate:** User reviews plan → `[Approve]` | `[Revise]` | `[Reject & Re-brainstorm]`

### Stage 3B: Issue (Tier 1 — inline, when applicable)

**Task:** Create structured issue document for bug reports or tracked problems.
**Input:** Bug report or problem description.
**Output:** Issue at `docs/issues/<YYYY-MM-DD>-<feature>.md`.
**Reference:** `specs/aidd-lifecycle.md` → PLAN phase (issue tracking)

---

### Stage 4: Commit Plan (Tier 3 subagent)

**Task:** Version-control the plan before any implementation.
**Input:** Approved plan document.
**Output:** Git commit (`docs(scope): add plan for <feature>`).
**Reference:** `specs/aidd-lifecycle.md` → Phase 3 (SPEC)

Steps:
1. Check current branch — suggest `feature/<name>` or `fix/<name>` if on `main`
2. Commit plan + issue docs separately from implementation
3. Confirm commit succeeded

---

### Stage 5: Execute (Adaptive — per-task model assignment)

**Task:** Implement the plan with verification at each step.
**Input:** Committed plan document.
**Output:** Working implementation.
**Reference:** `specs/aidd-lifecycle.md` → Phase 4 (BUILD)

Dispatch strategy:
- Assign model per the plan's Tier column
- Group independent tasks by tier, launch parallel subagents
- Sequential execution for dependent tasks
- Escalate on failure (retry one tier higher)
- If plan diverges from reality: update plan FIRST, then continue
- If blocked: stop, document blocker, ask user

See `specs/model-matrix.md` → Parallel Dispatch Pattern for execution examples.

---

### Stage 6: Completion (Adaptive — per-task model assignment)

**Task:** Verify, clean up, and archive.
**Input:** Completed implementation.
**Output:** Clean commit, passing checks, archived plan.
**Reference:** `specs/aidd-lifecycle.md` → Phases 5-6 (VERIFY, SHIP)

Task-to-tier assignment:
- Run typecheck/lint/tests → Tier 3
- Analyze failures → Tier 2 → 1 (escalate)
- Draft commit/PR → Tier 2
- Final architecture review → Tier 1

Checklist:
- [ ] All acceptance criteria met
- [ ] `typecheck` clean
- [ ] `lint` clean
- [ ] Tests passing
- [ ] No dead code
- [ ] Plan status updated to Complete
- [ ] Plan moved: `docs/plans/active/` → `docs/plans/done/`
- [ ] Implementation commit: `feat(scope): implement <feature>`
- [ ] Ask user: create PR, merge, or leave on branch

---

## Artifacts Produced

| Artifact              | Stage | Location                                      |
| --------------------- | ----- | --------------------------------------------- |
| Brainstorm Summary    | 1     | Inline (conversation) or `docs/plans/active/` |
| Research Summary      | 2     | Inline (conversation) or `docs/plans/active/` |
| Plan Document         | 3     | `docs/plans/active/<YYYY-MM-DD>-<feature>.md` |
| Issue Document        | 3B    | `docs/issues/<YYYY-MM-DD>-<feature>.md`       |
| Spec Commit           | 4     | Git history                                   |
| Implementation        | 5     | Source files per plan                         |
| Implementation Commit | 6     | Git history                                   |

---

## Success Criteria

- [ ] User's original intent is fully addressed
- [ ] Each phase gate was respected (no skipped approvals)
- [ ] Plan document exists and matches final implementation
- [ ] All acceptance criteria from the plan are met
- [ ] TypeScript clean, lint clean, tests passing
- [ ] Model usage is cost-efficient (minimum tier per task)
- [ ] No content duplication (this orchestrator references templates/specs, not copies them)

---

## Cost Estimation

| Tier       | Stages                                      | Est. Tokens        | Cost                | Total      |
| ---------- | ------------------------------------------- | ------------------ | ------------------- | ---------- |
| **Tier 1** | 3 (Intake, Brainstorm, Plan)                | ~30,000            | See model-matrix.md | ~$0.45     |
| **Tier 2** | 2 (Research, Execute complex)               | ~25,000            | See model-matrix.md | ~$0.08     |
| **Tier 3** | 2 (Commit Plan, Execute simple, Completion) | ~15,000            | See model-matrix.md | ~$0.02     |
| **Total**  | **7 stages**                                | **~70,000 tokens** | **Mixed**           | **~$0.55** |

Costs assume typical feature complexity. Actual costs vary based on research depth and implementation scope.

---

## Notes

### Stage Dependencies

```
Stage 0 (Intake) → determines entry point
  ↓
Stage 1 (Brainstorm) → can skip to Stage 3 if clear
  ↓
Stage 2 (Research) → can skip if no research needed
  ↓
Stage 3 (Plan) → required before execution
  ↓
Stage 4 (Commit Plan) → required before execution
  ↓
Stage 5 (Execute) → parallel dispatch within stage
  ↓
Stage 6 (Completion) → parallel dispatch within stage
```

This orchestrator references canonical sources rather than duplicating content. Each stage's **Reference:** field indicates the authoritative source for that stage's protocol.

### Failure Handling

- **Brainstorm stalled**: Ask more targeted questions; suggest concrete options.
- **Research inconclusive**: Document gaps in Unknown Factors; proceed with best available evidence.
- **Plan rejected**: Return to brainstorming or research as directed by user.
- **Execution blocked**: Stop, document blocker, ask user before proceeding.
- **Subagent failure**: Escalate to next model tier and retry.
- **Critical failure**: Stop orchestration and alert user.
