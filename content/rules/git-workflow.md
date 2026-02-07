# Git Workflow: Commit Standards & Branch Strategy

> **Activation:** All projects using Git version control. These rules govern commit hygiene, branching, and collaboration.

---

## Commit Format

All commits MUST follow Conventional Commits:

```
type(scope): description
```

- **type**: lowercase, from the allowed types table below
- **scope**: optional, lowercase, identifies the module or feature (e.g., `chat`, `flow`, `i18n`, `core`)
- **description**: imperative mood, lowercase start, no trailing period, max 72 characters
- **Body** (optional): separated by blank line, explains "why" not "what"
- **Footer** (optional): `BREAKING CHANGE:`, `Closes #123`, `Co-Authored-By:`

### Examples

```
feat(chat): add message search with FTS5 full-text indexing
fix(flow): prevent cycle detection false positive on self-referencing groups
docs(architecture): add ADR for event sourcing decision
refactor(core): extract transform logic into TransformExecutor service
```

---

## Commit Types

| Type       | Description                                                  | Triggers Release |
| ---------- | ------------------------------------------------------------ | ---------------- |
| `feat`     | New feature or capability                                    | minor            |
| `fix`      | Bug fix                                                      | patch            |
| `docs`     | Documentation only (specs, ADRs, guides, READMEs)            | no               |
| `refactor` | Code restructuring with no behavior change                   | no               |
| `test`     | Adding or updating tests                                     | no               |
| `chore`    | Build tooling, CI, dependency updates, housekeeping          | no               |
| `perf`     | Performance improvement with no behavior change              | patch            |
| `style`    | Formatting, whitespace, missing semicolons (no logic change) | no               |

---

## Branch Strategy

| Branch       | Purpose                    | Merges Into | Protection               |
| ------------ | -------------------------- | ----------- | ------------------------ |
| `main`       | Stable, release-ready code | —           | Protected, no force push |
| `feature/*`  | New features               | `main`      | Via pull request         |
| `fix/*`      | Bug fixes                  | `main`      | Via pull request         |
| `docs/*`     | Documentation changes      | `main`      | Via pull request         |
| `refactor/*` | Large-scale refactoring    | `main`      | Via pull request         |

### Branch Naming

- MUST use kebab-case after the prefix: `feature/workspace-folder-navigation`
- MUST be descriptive: `fix/cycle-detection-self-reference`, not `fix/bug`
- MUST NOT use personal names or ticket-only references: `feature/john-thing` or `feature/JIRA-123`

---

## Spec-First Flow

Specification commits MUST be separate from implementation commits. This enables review of the design before the code.

```
1. docs(chat): add spec for message search feature     ← SPEC COMMIT
2. feat(chat): implement FTS5 message search            ← IMPL COMMIT
3. test(chat): add search integration tests             ← TEST COMMIT
```

- The spec commit MUST land before or in the same PR as the implementation
- If implementation diverges from spec, the spec MUST be updated first: `docs(chat): update search spec to reflect pagination change`

---

## Immutable Constraints

These rules CANNOT be overridden:

1. **NEVER** force push to `main`. History on `main` is immutable.
2. **NEVER** commit secrets (API keys, passwords, tokens, `.env` files). Use `.gitignore`.
3. **NEVER** create empty commits. Every commit MUST contain a meaningful change.
4. **NEVER** mix unrelated concerns in a single commit. One logical change per commit.
5. **NEVER** commit generated files (`dist/`, `build/`, `node_modules/`) unless explicitly required (e.g., lock files).
6. **MUST** use `pnpm-lock.yaml` (or equivalent lock file) and commit it. Lock files ensure reproducible builds.

---

## Pull Request Requirements

- MUST have a clear title following commit format: `feat(scope): description`
- MUST include a description explaining the "why" and linking to relevant specs or issues
- MUST pass all CI checks (typecheck, lint, test, build) before merge
- MUST be reviewed by at least one other contributor (when team size > 1)
- SHOULD reference the spec or plan: `See docs/plans/active/message-search.md`

---

## GPG Signing

- GPG signing is RECOMMENDED for verified commits
- Configure with: `git config commit.gpgSign true`
- Verified commits provide non-repudiation and tamper evidence

---

## Anti-Patterns (MUST NOT)

- **Giant commits**: If a diff exceeds ~500 lines, break it into logical chunks
- **"WIP" commits on main**: Work-in-progress belongs on feature branches. Squash before merging.
- **Force pushing shared branches**: Rewriting history on branches others are using causes data loss
- **Merge commits as noise**: Use rebase or squash-merge to keep history linear when appropriate
- **Vague messages**: `fix stuff`, `update`, `changes` — these are meaningless. Be specific.
- **Committed secrets**: Even if removed in a later commit, secrets remain in git history forever

---

**Cross-references:** [specs/aidd-lifecycle.md](../specs/aidd-lifecycle.md) (SPEC and SHIP phases), [rules/security.md](security.md) (no secrets in version control)

**Version:** 1.0.0
**Last Updated:** 2026-02-04
**Applies To:** All projects using Git
