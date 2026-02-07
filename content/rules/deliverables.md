# Deliverables Rule: Required Outputs Per Feature

> **Scope:** ALL agents producing implementation work. Enforced at SHIP phase.

---

## Required Deliverables

Every non-trivial feature (moderate or complex) MUST produce these deliverables before SHIP phase completes:

### 1. Plan Document

**Path**: `docs/plans/active/<YYYY.MM.DD>-<feature>-plan.md`
**When**: PLAN phase (Phase 2)
**Content**: Task breakdown, file manifest, execution order, tier assignments.

- MUST list every file to create or modify.
- MUST include complexity and tier per task.
- MUST show dependency order.
- Moved to `docs/plans/done/` when feature is complete.

### 2. Architecture Decision Record (ADR)

**Path**: `docs/plans/active/<YYYY.MM.DD>-<feature>-adr.md`
**When**: PLAN phase (Phase 2)
**Content**: Context, decision, alternatives considered, consequences.

- MUST state the problem being solved.
- MUST list alternatives with trade-offs.
- MUST explain why the chosen approach wins.
- MUST document consequences (positive and negative).

### 3. Architecture Diagram

**Path**: `docs/plans/active/<YYYY.MM.DD>-<feature>-diagram.md`
**When**: PLAN or SPEC phase (Phase 2-3)
**Content**: Mermaid diagrams showing system architecture, data flow, entity relationships.

- MUST include at least one high-level architecture diagram.
- SHOULD include data flow or sequence diagrams when applicable.
- MUST use Mermaid syntax (renders in GitHub, VS Code, and Hub).

### 4. Implementation Summary

**Path**: Produced inline (not a file) at SHIP phase completion.
**When**: SHIP phase (Phase 6) — final output before commit.
**Content**: Concise structured report. See `specs/implementation-summary.md` for format.

- MUST be 20 lines or fewer.
- MUST include: architecture, wiring, build status, commits.
- MUST NOT contain unverified claims.
- MUST NOT contain filler or buzzwords.

---

## Enforcement

| Deliverable | Phase | Skippable? | Condition |
|-------------|-------|-----------|-----------|
| Plan | PLAN | Only for trivial changes | User confirms skip with `[Skip Plan]` |
| ADR | PLAN | Only if no architecture decisions | Single-file changes, no new patterns |
| Diagram | SPEC | Only if architecture is unchanged | Bug fixes, config changes |
| Summary | SHIP | Never | Always required. Even trivial changes get a 3-line summary. |

### Trivial Changes

For trivial changes (single-file edits, typo fixes, minor refactors):
- Plan: Optional (the task description serves as plan).
- ADR: Not required.
- Diagram: Not required.
- Summary: **Still required** — minimum 3 lines (feature name, build status, commit).

---

## MUST / MUST NOT Constraints

- Agents **MUST** produce the Implementation Summary at SHIP phase. No exceptions.
- Agents **MUST** create plan + ADR for moderate/complex features before entering BUILD.
- Agents **MUST NOT** claim a feature is "complete" without producing the summary.
- Agents **MUST NOT** skip the plan for complex features (10+ tasks) without user override.
- Agents **MUST** move plan documents from `active/` to `done/` when the feature ships.

---

## Cross-References

- **Lifecycle**: `specs/aidd-lifecycle.md`
- **Summary format**: `specs/implementation-summary.md`
- **Plan format**: `specs/aidd-lifecycle.md` (Phase 2 — PLAN)
- **ADR format**: `docs/plans/` (see existing ADRs for pattern)
- **Diagram format**: `docs/plans/` (see existing diagrams for pattern)
