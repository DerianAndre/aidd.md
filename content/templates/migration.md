# Migration — Version Upgrades, Framework Migrations, and Breaking Change Management

> Upgrade incrementally, test between every step, and always have a rollback path.

**Effort Tier**: 1-2 (HIGH for planning, STANDARD for execution)
**AIDD Skill**: `skills/platform-engineer/SKILL.md` (Dependency Migration & Upgrade)

---

## Purpose

Execute version upgrades and framework migrations safely through an incremental, tested, and reversible process. Each dependency is upgraded in isolation, verified independently, and committed separately. The output is a fully upgraded codebase with zero regressions and a migration log documenting every step taken.

---

## Preconditions

- [ ] Current version inventory complete (all dependencies with their current versions)
- [ ] Target versions identified for each dependency being upgraded
- [ ] Official migration guides read for every major version bump
- [ ] Breaking changes cataloged with their impact on the codebase
- [ ] Full test suite passing on the current codebase before starting

---

## Sub-Agent Roles

| Role | Responsibility |
|------|---------------|
| **Migration Specialist** | Reads official migration guides, identifies breaking changes, plans the upgrade order based on dependency graph, executes upgrades one at a time, applies codemods where available. |
| **Quality Engineer** | Runs tests, type checking, and build after every upgrade step. Verifies no regressions. Validates that deprecated APIs have been replaced with their successors. |

---

## Process Steps

### Step 1: Version Audit

Create a complete inventory:
- List every dependency with its current version and target version
- Categorize: patch (safe), minor (usually safe), major (breaking changes likely)
- Map the dependency graph: which upgrades depend on other upgrades
- Determine upgrade order (dependencies before dependents)

### Step 2: Read Official Migration Guides

For every major version bump:
- Search for the official migration guide for the target version
- Document every breaking change that affects the codebase
- Note available codemods (automated transformations)
- Note deprecated APIs and their replacements
- Note configuration format changes

### Step 3: Categorize Breaking Changes

For each breaking change, classify its type and plan the fix:

| Category | Action |
|----------|--------|
| **API Removal** | Find all usages, replace with successor API |
| **API Signature Change** | Update all call sites to new signature |
| **Behavior Change** | Review affected logic, update tests to match new behavior |
| **Configuration Change** | Update config files to new format |
| **Type Change** | Update TypeScript types/interfaces |
| **Dependency Chain** | Identify secondary dependencies that also need upgrading |

### Step 4: Plan Incremental Migration

Order the upgrades:
1. Leaf dependencies first (those with no downstream dependents)
2. One major dependency upgrade per commit
3. Group related patch/minor upgrades if they have no breaking changes
4. For framework upgrades (React, Vite, etc.), upgrade the framework last after its plugins

### Step 5: Execute (Per Dependency)

For each dependency upgrade, follow this exact cycle:
1. **Upgrade**: Update the version in package.json, run install
2. **Apply Codemods**: Run official codemods if available
3. **Fix Breaking Changes**: Address each cataloged breaking change
4. **Remove Deprecations**: Replace deprecated API usage with successors
5. **Test**: Run test suite, type checking, and build
6. **Commit**: One commit per dependency with message: "chore: upgrade [dep] from [old] to [new]"

If any step fails, fix the issue before proceeding. If the fix is non-trivial, document it in the migration log.

### Step 6: Final Verification

After all upgrades are complete:
- Run the full test suite
- Run type checking (tsc --noEmit)
- Run the build
- Run the application and smoke test critical paths
- Verify no deprecated API warnings in console
- Check bundle size has not regressed significantly

---

## Quality Gates

- [ ] All tests pass after each individual upgrade step
- [ ] No deprecated API usage remains in the codebase
- [ ] Official migration guide followed for every major version bump
- [ ] Codemods applied where provided by the framework
- [ ] TypeScript types updated to match new API shapes
- [ ] Full test suite, type checking, and build pass after all upgrades
- [ ] Migration log documents every step with before/after versions
- [ ] Each upgrade is in its own commit for easy rollback

---

## Anti-Patterns

| Anti-Pattern | Description | Mitigation |
|-------------|-------------|------------|
| **Big Bang Upgrade** | Upgrading all dependencies at once in a single commit | One major dependency per commit. Isolate changes so failures are traceable and reversible. |
| **Skipping Migration Guide** | Upgrading without reading the official migration documentation | Always read the migration guide first. It documents breaking changes you will not discover by trial and error. |
| **Testing Only at the End** | Running tests after all upgrades are complete | Test after every single upgrade step. A failure after 10 upgrades is 10x harder to debug. |
| **Ignoring Deprecation Warnings** | Leaving deprecated API calls in the codebase after upgrade | Replace every deprecated API with its successor during the upgrade. Deprecations become removals in the next major version. |
| **Assuming Backward Compatibility** | Expecting minor or patch versions to never break anything | Even minor versions can introduce subtle behavior changes. Test after every upgrade. |
| **Skipping Codemods** | Manually fixing what an automated codemod could handle | Always check if the framework provides codemods. They are tested against thousands of codebases and handle edge cases. |

---

## Cross-References

- **Platform Engineer skill**: `skills/platform-engineer/SKILL.md`
- **Quality Engineer skill**: `skills/quality-engineer/SKILL.md`
- **Testing rules**: `rules/testing.md`
- **Global rules**: `rules/global.md`
- **Feature branch workflow**: `workflows/feature-branch.md`
