# Global Rules

> Immutable constraints that supersede all other rules.

**Last Updated**: 2026-02-04
**Status**: Reference

---

## Heuristics

- **Evidence-First**: Decisions must trace to principles, data, or standards. Never opinions.
- **BLUF**: Bottom Line Up Front. Direct answer first, then context.
- **First Principles**: Deconstruct to atomic truths before building solutions.

---

## Immutability Constraints

1. Never break backward compatibility without explicit confirmation
2. Never commit secrets to version control
3. Never disable tests to make CI pass
4. Never use `any` type in TypeScript without documented exception
5. Never use `SELECT *` in production SQL
6. Readability > Cleverness
