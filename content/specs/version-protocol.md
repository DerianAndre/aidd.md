# Version Verification Protocol — 4-Step Stack Validation

> Systematic process to detect, verify, and validate project dependencies before generating any code.

**Last Updated**: 2026-02-04
**Status**: Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Protocol Steps](#2-protocol-steps)
3. [Anti-Legacy Patterns](#3-anti-legacy-patterns)

---

## 1. Overview

The Version Verification Protocol prevents the generation of code that targets outdated, deprecated, or non-existent APIs. It runs before any implementation work begins and produces a verified stack profile that governs all subsequent code generation.

The protocol operates on a single principle: **never trust training data over project reality**. The `package.json` is the source of truth for what versions are installed. Documentation for the current year is the source of truth for what APIs exist.

---

## 2. Protocol Steps

### STEP 1 — DETECT PROJECT STACK

**Objective**: Build a complete dependency inventory from project files.

Actions:
- Read `package.json` at the project root. Extract all `dependencies` and `devDependencies` with exact versions.
- If a monorepo structure is detected (workspace configuration, `pnpm-workspace.yaml`, `turbo.json`, `lerna.json`), read `package.json` in every workspace package.
- Extract exact versions of ALL major dependencies. Strip version prefixes (`^`, `~`) to identify the minimum installed version.
- Note the package manager and its version (npm, pnpm, yarn, bun).
- Check for framework-specific configuration files (e.g., `vite.config.ts`, `next.config.js`, `astro.config.mjs`) to confirm framework presence.

**Output**: A dependency map of `{ package: version }` for all significant dependencies.

### STEP 2 — LOAD PROJECT CONTEXT

**Objective**: Discover and load project-specific conventions, memory, and configuration.

Actions:
- Check for AIDD structure (`AGENTS.md` + `rules/` + `skills/`): if found, load `AGENTS.md` as the source of truth for agent behavior.
- Check for `.aidd/` folder (`AGENTS.md`, `memory/`, `rules/`, `llms/`): if found, load `AGENTS.md` and consult memory files.
- Check for project-specific configuration (e.g., `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`): read for project conventions.
- If `.aidd/memory/` or `memory/` exists, consult `decisions.json`, `mistakes.json`, and `conventions.json` for prior context.

**Output**: Loaded project conventions, known decisions, and prior mistakes.

### STEP 3 — VERIFY DOCUMENTATION

**Objective**: Ensure generated code targets APIs that exist in the detected versions.

Actions:
- For any framework or library being used, search for documentation from the current year.
- Check if specialized context tools exist for the framework (documentation servers, context providers, API references).
- If no specialized context source exists, suggest finding or creating one.
- Verify that any API, method, or pattern being used exists in the detected version, not just in the latest version.
- Prefer current-year documentation over training data. Training data may reference APIs from older or newer versions.

**Output**: Verified API surface for all major dependencies.

### STEP 4 — ANTI-LEGACY FILTER

**Objective**: Reject patterns that belong to older versions of detected dependencies.

Actions:
- Cross-reference generated code patterns against the detected version.
- Reject known deprecated patterns for the installed version.
- If uncertain about whether an API exists in a specific version, state the uncertainty explicitly. Do not silently generate potentially invalid code.
- Flag stale training data: when using knowledge that may be outdated, note it.
- Never generate code using deprecated APIs without an explicit warning and rationale.

**Output**: Confidence level (high/medium/low) for each major API usage.

---

## 3. Anti-Legacy Patterns

Common version-sensitive patterns to watch for (non-exhaustive, illustrative):

| Framework | Version | Reject | Use Instead |
|-----------|---------|--------|-------------|
| Tailwind CSS | >= 4.0 | `tailwind.config.js`, `content` array | CSS-only `@theme` configuration |
| React | >= 19 | Class components, legacy context API | Server Components, `use()` hook, concurrent features |
| Astro | >= 5.0 | `getStaticPaths` with old collection API | Content Layer API with `loader`, Astro Actions |
| Next.js | >= 15 | `pages/` router (for new projects) | `app/` router, Server Actions |
| Zod | >= 4.0 | `.parse()` without error handling | Check for API changes in v4 |
| Vitest | >= 4.0 | Legacy configuration keys | Verify config schema against v4 docs |

This table is illustrative. The actual patterns to reject depend on the project's detected versions. Always verify against current documentation rather than relying on a static list.

**Key rule**: When in doubt, verify. The cost of checking documentation is negligible compared to the cost of debugging code that targets a non-existent API.
