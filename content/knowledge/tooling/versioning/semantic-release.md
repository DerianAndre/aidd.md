---
name: Semantic Release
category: tooling
last_updated: 2026-01-14
maturity: stable
---

# Semantic Release

## Overview

Automated versioning and package publishing based on conventional commits. Analyzes commit messages to determine version bumps, generates changelog, and publishes to npm. Eliminates manual release process.

## Key Metrics

- **Automation:** Full CI/CD release workflow (version, changelog, publish)
- **Standard:** Conventional Commits for semantic versioning
- **DX:** Zero manual steps after setup
- **Maturity:** 10+ years, production-grade
- **Cost:** Free, open-source

## Use Cases

| Scenario                  | Fit Score (1-10) | Rationale                                        |
| ------------------------- | ---------------- | ------------------------------------------------ |
| npm package publishing    | 10               | Automate version bumps, changelog, npm publish   |
| Monorepos with versioning | 9                | Plugin for workspace versioning                  |
| Open-source projects      | 10               | Automated releases from CI/CD (GitHub Actions)   |
| Internal libraries        | 8                | Still useful, less critical than public packages |
| No CI/CD                  | 3                | semantic-release requires CI environment         |

## Trade-offs

### Strengths

- **Automated:** Commit → CI → version bump → changelog → publish
- **Semantic Versioning:** `feat` = minor, `fix` = patch, `BREAKING CHANGE` = major
- **Changelog:** Auto-generated from commits
- **Git Tags:** Automatic release tags

### Weaknesses

- **Requires CI/CD:** Manual releases not supported
- **Commit Discipline:** Team must use conventional commits correctly
- **Setup Complexity:** Initial configuration (plugins, CI tokens)
- **Opinionated:** Less flexible than manual versioning

## Implementation Pattern

```bash
npm install semantic-release @semantic-release/changelog @semantic-release/git --save-dev
```

```javascript
// .releaserc.js
module.exports = {
  branches: ["main"],
  plugins: [
    "@semantic-release/commit-analyzer", // Analyze commits
    "@semantic-release/release-notes-generator", // Generate changelog
    "@semantic-release/changelog", // Update CHANGELOG.md
    "@semantic-release/npm", // Publish to npm
    [
      "@semantic-release/git",
      {
        assets: ["CHANGELOG.md", "package.json"],
        message:
          "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
    "@semantic-release/github", // Create GitHub release
  ],
};
```

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - run: npm ci
      - run: npm test

      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Commit Examples

```bash
# Patch release (1.0.0 → 1.0.1)
git commit -m "fix(auth): resolve token expiration bug"

# Minor release (1.0.1 → 1.1.0)
git commit -m "feat(api): add user profile endpoint"

# Major release (1.1.0 → 2.0.0)
git commit -m "feat(api)!: redesign authentication flow

BREAKING CHANGE: Old /api/login endpoint removed, use /api/auth/login"
```

## Semantic Release vs Alternatives

| Aspect          | Semantic Release | Manual npm publish | Changesets |
| --------------- | ---------------- | ------------------ | ---------- |
| **Automation**  | Full ✅          | None               | Partial    |
| **Changelog**   | Auto ✅          | Manual             | Auto ✅    |
| **Monorepo**    | Plugin           | Manual             | Native ✅  |
| **Setup**       | Moderate         | Easy ✅            | Easy       |
| **CI Required** | Yes              | No ✅              | No ✅      |

## Alternatives

| Alternative           | When to Choose Instead                                   |
| --------------------- | -------------------------------------------------------- |
| **Manual Versioning** | Small projects, infrequent releases, no CI/CD            |
| **Changesets**        | Monorepos, prefer manual changelog editing, no automatic |
| **np**                | Simple CLI for npm publish, less automation              |

## References

- [Semantic Release Docs](https://semantic-release.gitbook.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [semantic-release Plugins](https://semantic-release.gitbook.io/semantic-release/extending/plugins-list)
