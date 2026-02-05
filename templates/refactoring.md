# Refactoring — Tests-First Atomic Transformations

> Every step independently verifiable. Green before, green after, or revert immediately.

**Effort Tier**: 1 to 2 (HIGH for planning, STANDARD for execution)
**AIDD Skill**: `skills/quality-engineer/SKILL.md` (Structural Improvement)

---

## Purpose

Execute safe, incremental refactoring through atomic transformations where each step is independently verifiable. Tests serve as the safety net: if they break, revert immediately and try a different approach. Refactoring changes structure without changing behavior.

---

## Preconditions

- [ ] Green test baseline confirmed (all tests pass before starting)
- [ ] Clear refactoring goal defined (what structural improvement and why)
- [ ] Scope bounded (which files/modules are affected)
- [ ] No unrelated changes in the working tree (clean git state preferred)
- [ ] Understanding of existing test coverage for affected code

---

## Sub-Agent Roles

| Role | Responsibility |
|------|---------------|
| **Architect** | Plans the transformation sequence. Ensures each step maintains structural integrity and moves toward the goal. Identifies dependencies between transformations. |
| **Quality Engineer** | Validates test coverage before starting. Runs tests after every transformation. Identifies gaps in test coverage that create refactoring risk. |

---

## Process Steps

### Step 1: Verify Green Baseline

Before any changes:
- Run the relevant test suite
- Confirm all tests pass
- Run type checking
- Record the baseline state (test count, pass count)

If tests are not green: **STOP**. Fix failing tests first. Do not refactor on a red baseline.

### Step 2: Identify Refactoring Targets

Document each target with:
- **What**: The specific code smell, structural issue, or improvement
- **Where**: File path and location
- **Why**: What problem this refactoring solves
- **Risk**: What could go wrong

### Step 3: Plan Atomic Transformation Sequence

Design a sequence where:
- Each step is a single, focused transformation
- Each step is independently deployable (the codebase works after each step)
- Steps are ordered to minimize risk (safest first)
- No step combines multiple unrelated changes

Common atomic transformations:
- Extract function/method
- Rename symbol
- Move to separate file
- Replace conditional with polymorphism
- Introduce interface/abstraction
- Inline unnecessary abstraction
- Consolidate duplicated logic

### Step 4: Execute One Transformation

For each transformation in the sequence:

1. **Make the change** — One focused structural modification
2. **Run tests immediately** — Execute targeted tests for the affected code
3. **Run type checking** — Verify types if types are affected
4. **Evaluate result**:
   - All green: Proceed to next transformation
   - Any red: **Revert immediately**, analyze why, plan alternative approach

### Step 5: Handle Failures

If a transformation breaks tests:
1. **Revert** the change immediately (do not attempt to "fix forward")
2. **Analyze** why the test broke (was it a behavior change? missing dependency? wrong assumption?)
3. **Decompose** the transformation into smaller steps, or choose a different approach
4. **Retry** with the revised plan

### Step 6: Final Verification

After all transformations are complete:
1. Run the full relevant test suite
2. Run type checking across affected packages
3. Verify the refactoring goal was achieved
4. Confirm no new dependencies were introduced without justification
5. Review the diff for any accidental behavior changes

---

## Quality Gates

- [ ] Green baseline verified before first change
- [ ] Tests run after every single transformation (not batched)
- [ ] No test failures were "fixed forward" (all failures triggered revert)
- [ ] No behavior changes introduced (unless explicitly intended and documented)
- [ ] No new dependencies added without justification
- [ ] Type checking passes after all transformations
- [ ] Final diff reviewed for accidental changes
- [ ] Refactoring goal demonstrably achieved

---

## Anti-Patterns

| Anti-Pattern | Description | Mitigation |
|-------------|-------------|------------|
| **Refactoring Without Tests** | Changing structure without a test safety net | Verify green baseline; if coverage is insufficient, write tests first |
| **Big-Bang Refactoring** | Making many changes at once before testing | Enforce atomic steps; one transformation, one test run |
| **Fix Forward** | Trying to fix broken tests after a bad refactoring step | Always revert on red; analyze and retry with a different approach |
| **Feature Mixing** | Adding new functionality during a refactoring pass | Refactoring changes structure, not behavior; keep feature work separate |
| **API Breaking** | Breaking public interfaces without migration path | If public APIs must change, provide a deprecation/migration plan first |
| **Invisible Rationale** | Making structural changes without documenting why | Every transformation must have a documented reason in Step 2 |
| **Coverage Assumption** | Assuming tests cover the affected code paths | Verify coverage for affected code before starting; add tests if gaps exist |

---

## Cross-References

- **Review workflow**: `workflows/review.md`
- **Testing rules**: `rules/testing.md`
- **Code style rules**: `rules/code-style.md`
- **Quality Engineer skill**: `skills/quality-engineer/SKILL.md`
- **Global rules**: `rules/global.md`
