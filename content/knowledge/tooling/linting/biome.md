---
name: Biome
category: tooling
last_updated: 2026-01-14
maturity: emerging
---

# Biome

## Overview

Rust-based linter and formatter that replaces ESLint + Prettier. Unified toolchain with zero config, extreme speed, and consistent formatting/linting rules.

## Key Metrics

- **Performance:** 10-100x faster than ESLint+Prettier (Rust-based)
- **Bundle Size:** Single binary (~20MB vs dual ESLint+Prettier setup)
- **DX:** Zero config, unified tool, consistent output
- **Maturity:** v1.0+ (2025), production-ready, growing adoption
- **Cost:** Free, open-source

## Use Cases

| Scenario                                     | Fit Score (1-10) | Rationale                                    |
| -------------------------------------------- | ---------------- | -------------------------------------------- |
| Monorepos (large codebases)                  | 10               | 100x faster = minutes vs hours for full lint |
| CI/CD pipelines                              | 10               | Speed reduces compute costs significantly    |
| Teams frustrated with ESLint config          | 9                | Opinionated, minimal configuration           |
| Projects with complex ESLint plugins         | 6                | Plugin ecosystem smaller than ESLint (2026)  |
| Legacy projects (heavy ESLint customization) | 5                | Migration effort required                    |

## Trade-offs

### Strengths

- **Speed:** 10-100x faster than ESLint+Prettier (Rust-compiled)
- **Unified:** Single tool = no conflicts between linter and formatter
- **Zero Config:** Works out-of-box with sane defaults
- **Consistent:** Deterministic formatting (no ESLint/Prettier rule conflicts)

### Weaknesses

- **Plugin Ecosystem:** Smaller than ESLint (fewer custom rules available)
- **Migration:** Requires refactoring ESLint configs (though tooling exists)
- **Adoption:** Less mature than ESLint (community smaller in 2026)
- **TypeScript:** Good but not as deep as typescript-eslint

## Alternatives

| Alternative           | When to Choose Instead                                       |
| --------------------- | ------------------------------------------------------------ |
| **ESLint + Prettier** | Need specific plugins (e.g., React hooks, a11y) not in Biome |
| **deno fmt/lint**     | Already using Deno runtime                                   |

## References

- [Biome vs ESLint Showdown (2025)](https://medium.com/@harryespant/biome-vs-eslint-the-ultimate-2025-showdown-for-javascript-developers-speed-features-and-3e5130be4a3c)
- [Biome.js Official Docs](https://biomejs.dev/)
- [Meet Biome.js (2025)](https://prolifics.com/usa/resource-center/news/biomejs-rust-tools-eslint-prettier-alternative-ai)
