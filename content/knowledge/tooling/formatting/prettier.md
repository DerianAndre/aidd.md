---
name: Prettier
category: tooling
last_updated: 2026-01-14
maturity: stable
---

# Prettier

## Overview

Opinionated code formatter with zero configuration. Industry standard for consistent formatting but slower than Biome. Often used alongside ESLint.

## Key Metrics

- **Performance:** Baseline (Biome is 10-100x faster)
- **Configuration:** Minimal (opinionated by design)
- **Language Support:** JS, TS, CSS, HTML, Markdown, YAML, JSON
- **DX:** Editor integration (VS Code, WebStorm), Git hooks
- **Maturity:** 8+ years production-grade, massive adoption
- **Cost:** Free, open-source

## Use Cases

| Scenario                                  | Fit Score (1-10) | Rationale                                      |
| ----------------------------------------- | ---------------- | ---------------------------------------------- |
| Teams with formatting debates             | 10               | Opinionated = no bikeshedding ("use Prettier") |
| Existing projects with Prettier           | 10               | Migration cost to Biome not justified          |
| Multi-language projects (CSS + JS + YAML) | 9                | Formats 15+ languages (vs Biome's JS/TS focus) |
| New projects (greenfield)                 | 6                | Biome faster, unified linting+formatting       |
| Large CI/CD pipelines                     | 5                | Biome 100x faster = cost savings               |

## Trade-offs

### Strengths

- **Opinionated:** No config debates (2-space vs 4-space resolved)
- **Language Coverage:** 15+ languages (JS, TS, CSS, HTML, Markdown, JSON, YAML)
- **Ecosystem:** Editor plugins, pre-commit hooks (husky + lint-staged)
- **Stability:** Mature formatting algorithm (rare edge cases)

### Weaknesses

- **Speed:** 100x slower than Biome (JavaScript vs Rust)
- **ESLint Conflicts:** Requires eslint-config-prettier to avoid collisions
- **Limited Customization:** Intentionally opinionated (few options)
- **Dual Tooling:** Separate from linting (vs Biome unified)

## Alternatives

| Alternative      | When to Choose Instead                             |
| ---------------- | -------------------------------------------------- |
| **Biome**        | Need speed, unified linting+formatting, JS/TS only |
| **dprint**       | Want Rust-speed formatter with more config options |
| **No Formatter** | Team disciplined enough to manually format (rare)  |

## References

- [Prettier Official Docs](https://prettier.io/)
- [Biome vs Prettier Comparison](https://medium.com/@harryespant/biome-vs-eslint-the-ultimate-2025-showdown-for-javascript-developers-speed-features-and-3e5130be4a3c)
- [Prettier vs ESLint](https://prettier.io/docs/en/comparison.html)
