---
name: ESLint
category: tooling
last_updated: 2026-01-14
maturity: stable
---

# ESLint

## Overview

Industry-standard JavaScript linter with massive plugin ecosystem. Mature but slower than Rust-based alternatives (Biome). Ubiquitous in legacy projects.

## Key Metrics

- **Performance:** Baseline (Biome is 10-100x faster)
- **Ecosystem:** Largest (react-hooks, a11y, import, TypeScript plugins)
- **DX:** Highly configurable, extensive rules, auto-fix
- **Maturity:** 10+ years, production-grade, massive adoption
- **Cost:** Free, open-source

## Use Cases

| Scenario                                        | Fit Score (1-10) | Rationale                                  |
| ----------------------------------------------- | ---------------- | ------------------------------------------ |
| Existing projects with complex configs          | 10               | Migration cost outweighs Biome speed gains |
| React projects (need eslint-plugin-react-hooks) | 9                | Most mature React-specific rules           |
| Teams familiar with ESLint                      | 9                | No learning curve, known patterns          |
| New projects (greenfield)                       | 6                | Biome faster, simpler config               |
| Large monorepos (CI optimization)               | 5                | Biome 100x faster = significant CI savings |

## Trade-offs

### Strengths

- **Ecosystem:** Most plugins (a11y, import sorting, security)
- **Configurability:** Infinite customization (rules, plugins, overrides)
- **TypeScript:** Deep integration via @typescript-eslint
- **Community:** Largest (Stack Overflow, tutorials, presets)

### Weaknesses

- **Speed:** 10-100x slower than Biome (JavaScript vs Rust)
- **Configuration Complexity:** `.eslintrc` can grow to 1000+ lines
- **Prettier Conflicts:** Requires eslint-config-prettier to avoid collisions
- **Maintenance:** Multiple dependencies (ESLint + Prettier + plugins)

## Alternatives

| Alternative             | When to Choose Instead                                 |
| ----------------------- | ------------------------------------------------------ |
| **Biome**               | Need speed, unified linting+formatting, minimal config |
| **Standard JS**         | Want zero-config (opinionated, no customization)       |
| **TypeScript Compiler** | Type-checking sufficient, don't need style linting     |

## References

- [ESLint Official Docs](https://eslint.org/)
- [Biome vs ESLint (2025)](https://medium.com/@harryespant/biome-vs-eslint-the-ultimate-2025-showdown-for-javascript-developers-speed-features-and-3e5130be4a3c)
- [ESLint Configuration Guide](https://eslint.org/docs/latest/use/configure/)
