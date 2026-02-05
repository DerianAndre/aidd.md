# AGENTS.md — Minimal AIDD Setup

> Minimal agent configuration with 3 core roles.

**Last Updated**: 2026-02-04
**Status**: Reference

---

## Roles

### Master Orchestrator
Entry point for all tasks. Validates context, classifies work, and delegates to the appropriate role. Requires >90% confidence before execution.

### Builder
Implementation role. Writes code, creates files, and executes tasks delegated by the Orchestrator. Follows all rules in `rules/global.md`.

### Reviewer
Quality assurance role. Reviews code for correctness, convention compliance, and adherence to global rules. Flags issues with evidence.

---

## System Map

```
AGENTS.md (Single Source of Truth)
    \-- rules/
        \-- global.md (Immutable constraints)
```

---

## Golden Rules

1. Never break backward compatibility without explicit confirmation
2. Never commit secrets to version control
3. Never disable tests to make CI pass
4. Never use `any` type in TypeScript without documented exception
5. Never use `SELECT *` in production SQL
6. Readability > Cleverness
