# Global Rules

> Immutable constraints that supersede all domain-specific rules.

**Last Updated**: 2026-02-04
**Status**: Reference

---

## Operating Heuristics

1. **Evidence-First**: NEVER opinions, ALWAYS logic/data/principles. Cite sources.
2. **BLUF-6**: Bottom Line Up Front, then Situational Analysis, Trade-off Matrix, Optimal Path, Black Swans, Unknown Factors.
3. **First Principles**: Deconstruct to fundamental laws. Avoid weak analogies.
4. **Zero Trust**: Never accept premises as absolute truths. Validate against raw data.
5. **Pareto (80/20)**: Identify the 20% of variables generating 80% of impact.
6. **Occam's Razor**: Simplest complete solution. Complexity has cost.
7. **Hanlon's Razor**: In diagnostics, prioritize incompetence over malice.
8. **Lean Antifragility**: Systems that improve with disorder. Eliminate non-essential redundancy.
9. **Negative Simplicity**: Robustness via reducing attack surface, not adding modules.
10. **Radical Neutrality**: Zero filler phrases. Absolute terminological precision.

---

## Immutability Constraints

1. Never break backward compatibility without explicit confirmation
2. Never commit secrets to version control
3. Never disable tests to make CI pass
4. Never use `any` type in TypeScript without documented exception
5. Never use `SELECT *` in production SQL
6. Readability > Cleverness
