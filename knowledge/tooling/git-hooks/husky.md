---
name: Husky
category: tooling
last_updated: 2026-01-14
maturity: stable
---

# Husky

## Overview

Git hooks manager for JavaScript projects. Automate pre-commit linting, testing, formatting before code reaches repository. Industry standard for enforcing code quality in teams.

## Key Metrics

- **Setup:** 2-minute install, zero config
- **DX:** Automatic hooks registration, npm scripts integration
- **CI/CD:** Ensures commits are clean before pushing
- **Maturity:** 10+ years, production-grade
- **Cost:** Free, open-source

## Use Cases

| Scenario                     | Fit Score (1-10) | Rationale                                                   |
| ---------------------------- | ---------------- | ----------------------------------------------------------- |
| Team projects (>2 engineers) | 10               | Enforce linting/testing before commit (prevent broken code) |
| Need commit conventions      | 10               | Pair with Commitlint for semantic commits                   |
| Prevent bad commits          | 10               | Lint, test, format before committing                        |
| Solo developer               | 7                | Still useful (enforce personal standards), less critical    |
| CI/CD only enforcement       | 5                | Husky runs locally (complement CI, don't replace)           |

## Trade-offs

### Strengths

- **Simple Setup:** `npx husky-init && npm install` = done
- **Enforce Quality:** Linting, testing, formatting before commits
- **Team Consistency:** Everyone runs same checks (vs selective CI)
- **Fast Feedback:** Catch issues locally (vs waiting for CI)

### Weaknesses

- **Local Only:** Can be bypassed with `--no-verify` flag
- **Performance:** Pre-commit hooks slow for large projects
- **Windows Support:** Some hooks may need cross-platform scripts
- **Not CI Replacement:** Complement CI, don't replace (always run CI)

## Implementation Pattern

```bash
# Install Husky
npm install husky --save-dev
npx husky-init

# Create pre-commit hook
npx husky add .husky/pre-commit "npm run lint"
npx husky add .husky/pre-commit "npm run test"

# Create commit-msg hook (with Commitlint)
npx husky add .husky/commit-msg "npx commitlint --edit $1"

# Create pre-push hook
npx husky add .husky/pre-push "npm run build"
```

```json
// package.json
{
  "scripts": {
    "prepare": "husky install", // Auto-install hooks
    "lint": "biome check .",
    "test": "vitest run",
    "format": "biome format --write ."
  }
}
```

```.husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run linting
npm run lint

# Run tests
npm run test

# Format staged files
npx lint-staged
```

## Husky + lint-staged

```bash
npm install lint-staged --save-dev
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,ts,jsx,tsx}": ["biome format --write", "biome lint --apply"],
    "*.{json,md}": ["biome format --write"]
  }
}
```

```.husky/pre-commit
#!/usr/bin/env sh
npx lint-staged
```

## Husky vs Alternatives

| Aspect          | Husky            | Pre-commit (Python) | Lefthook  |
| --------------- | ---------------- | ------------------- | --------- |
| **Language**    | JavaScript ✅    | Python              | Go        |
| **Ecosystem**   | npm/yarn/pnpm ✅ | pip                 | Universal |
| **Performance** | Good             | Fast ✅             | Fastest   |
| **Adoption**    | Highest ✅       | Moderate            | Growing   |
| **Setup**       | Easy ✅          | Moderate            | Easy      |

## Alternatives

| Alternative             | When to Choose Instead                                   |
| ----------------------- | -------------------------------------------------------- |
| **Lefthook**            | Need faster hooks, Go-based, cross-language projects     |
| **Pre-commit (Python)** | Python ecosystem, language-agnostic hooks                |
| **CI Only**             | Trust team discipline, fast local commits more important |

## References

- [Husky Official Docs](https://typicode.github.io/husky/)
- [lint-staged](https://github.com/lint-staged/lint-staged)
- [Git Hooks Best Practices](https://github.com/typicode/husky#best-practices)
