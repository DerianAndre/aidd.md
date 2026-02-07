---
name: Commitlint
category: tooling
last_updated: 2026-01-14
maturity: stable
---

# Commitlint

## Overview

Enforce conventional commit messages for semantic versioning and automated changelog generation. Pairs with Husky to validate commits before acceptance. Standard for professional projects.

## Key Metrics

- **Standard:** Conventional Commits specification
- **DX:** Clear error messages, shared config (extends @commitlint/config-conventional)
- **CI Integration:** Works with Husky, semantic-release, changelog generators
- **Maturity:** 8+ years, production-grade
- **Cost:** Free, open-source

## Use Cases

| Scenario                            | Fit Score (1-10) | Rationale                                             |
| ----------------------------------- | ---------------- | ----------------------------------------------------- |
| Team projects (semantic versioning) | 10               | Enforced commit format = automated changelog/releases |
| Need automated releases             | 10               | Pairs with semantic-release for CI/CD automation      |
| Open-source projects                | 9                | Contributors follow same commit conventions           |
| Solo developer                      | 6                | Still useful for discipline, less critical            |
| Rapid prototyping                   | 4                | Overhead vs development speed                         |

## Trade-offs

### Strengths

- **Semantic Versioning:** `feat:` = minor, `fix:` = patch, `BREAKING CHANGE:` = major
- **Automated Changelog:** Generate from commit history
- **Team Consistency:** Same commit format across engineers
- **CI/CD Integration:** semantic-release reads commits for auto-bumping versions

### Weaknesses

- **Learning Curve:** Team must learn convention (feat, fix, chore, etc.)
- **Local Bypass:** Can `--no-verify` commits
- **Verbose:** Longer commit messages vs freeform
- **Overhead:** For small projects, may be overkill

## Implementation Pattern

```bash
npm install @commitlint/cli @commitlint/config-conventional --save-dev

# Create config
echo "module.exports = {extends: ['@commitlint/config-conventional']}" > commitlint.config.js

# Add Husky hook
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit $1'
```

```javascript
// commitlint.config.js
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "docs", // Documentation
        "style", // Code style (formatting, no logic change)
        "refactor", // Code refactor
        "perf", // Performance improvement
        "test", // Add/update tests
        "chore", // Maintenance (deps, config)
        "ci", // CI/CD changes
        "revert", // Revert previous commit
      ],
    ],
    "scope-case": [2, "always", "lower-case"],
    "subject-case": [
      2,
      "never",
      ["sentence-case", "start-case", "pascal-case", "upper-case"],
    ],
  },
};
```

## Conventional Commit Format

```bash
type(scope?): subject

body?

footer?
```

### Examples

```bash
# Feature (minor version bump)
feat(auth): add Google OAuth login

# Bug fix (patch version bump)
fix(api): resolve 500 error on user creation

# Breaking change (major version bump)
feat(api)!: redesign REST API endpoints

BREAKING CHANGE: /api/v1/users changed to /api/v2/users

# Chore (no version bump)
chore(deps): update dependencies

# Multiple scopes
fix(auth,api): resolve token validation issue
```

## Commitlint vs Alternatives

| Aspect          | Commitlint              | Husky alone | Manual review |
| --------------- | ----------------------- | ----------- | ------------- |
| --------        |
| **Enforcement** | Automated ✅            | Hooks only  | Manual        |
| **Standards**   | Conventional Commits ✅ | None        | Varies        |
| **Automation**  | semantic-release ✅     | No          | No            |
| **Team**        | Consistent ✅           | Varies      | Varies        |

## Alternatives

| Alternative       | When to Choose Instead                                   |
| ----------------- | -------------------------------------------------------- |
| **Manual Review** | Small team, freeform commits preferred                   |
| **Husky Only**    | Just need pre-commit hooks, no commit format enforcement |
| **Danger.js**     | Need PR-level checks (vs commit-level)                   |

## References

- [Commitlint Official Docs](https://commitlint.js.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [semantic-release](https://github.com/semantic-release/semantic-release)
