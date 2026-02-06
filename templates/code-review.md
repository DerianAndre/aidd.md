# Code Review — Pre-Merge Quality Assurance

> Architecture first, security second, style last.

**Effort Tier**: 1 (HIGH)
**AIDD Skill**: `skills/quality-engineer/SKILL.md` + `workflows/review.md`

---

## Preconditions

- PR/diff available for review
- Project conventions known (AGENTS.md, project rules)
- Understanding of feature requirements

## Sub-Agent Roles

| Role                 | Focus                                          |
| -------------------- | ---------------------------------------------- |
| **Senior Reviewer**  | Architecture, design patterns, business logic  |
| **Security Auditor** | Vulnerability scanning, input validation, auth |

## Review Order (Priority)

1. **Architecture compliance** (most critical, hardest to fix later)
2. **Security** (vulnerabilities, input validation, auth)
3. **Performance** (N+1 queries, re-renders, bundle impact)
4. **Testing coverage** (new code has tests, edge cases)
5. **Code quality** (types, naming, conventions)
6. **Accessibility** (WCAG, keyboard, screen reader — if frontend)
7. **Documentation** (complex logic explained, APIs documented)

## Severity Levels

| Level          | Description                                                    | Action Required                     |
| -------------- | -------------------------------------------------------------- | ----------------------------------- |
| **Blocker**    | Security vulnerabilities, data loss risk, broken functionality | Must fix before merge               |
| **Critical**   | Architecture violations, missing tests for critical paths      | Should fix before merge             |
| **Major**      | Code quality issues, missing edge cases                        | Fix in this PR or tracked follow-up |
| **Minor**      | Naming, minor style improvements                               | Nice to have                        |
| **Suggestion** | Alternative approaches, future considerations                  | Optional                            |

## Process

### Step 1 — Context
- Read PR description and linked issues
- Understand the feature/fix intent
- Check if spec exists and compare

### Step 2 — Architecture Review
- Dependencies flow inward (domain has zero framework imports)
- Ports and adapters pattern respected
- Aggregate boundaries maintained
- No cross-aggregate direct references

### Step 3 — Security Review (OWASP Quick Check)
- Input validation at boundaries (Zod)
- No injection vectors (parameterized queries, output encoding)
- No hardcoded secrets
- Auth/authz checks in place
- CORS properly configured

### Step 4 — Performance Review
- No N+1 queries
- React re-renders minimized (check dependency arrays)
- Bundle impact considered (new dependencies justified)
- Caching appropriate

### Step 5 — Testing Review
- New code has corresponding tests
- Coverage targets met per layer
- Edge cases and error paths tested
- No disabled/skipped tests

### Step 6 — Code Quality
- TypeScript strict (no any without justification)
- Naming follows conventions (kebab-case files, PascalCase types)
- No dead code or commented-out blocks
- i18n: no hardcoded user-facing strings

### Step 7 — Summary (BLUF Format)
- Bottom line: approve / request changes / needs discussion
- Key findings (severity-ranked)
- Positive observations (brief)

## Checklist

- [ ] Architecture: dependencies flow inward, domain pure
- [ ] Security: no injection, no hardcoded secrets, input validated
- [ ] Performance: no N+1, no unnecessary re-renders
- [ ] Testing: new code tested, coverage met
- [ ] Types: TypeScript strict, no unjustified `any`
- [ ] Naming: project conventions followed
- [ ] i18n: no hardcoded user-facing strings
- [ ] Accessibility: WCAG 2.1 AA (if frontend)
- [ ] Dead code: no commented-out blocks, no unused imports
- [ ] Spec alignment: implementation matches specification

## Quality Gates

- [ ] All blockers resolved
- [ ] All critical items resolved or tracked
- [ ] Review summary provided in BLUF format
- [ ] Security quick check completed

## Anti-Patterns

- Rubber stamping (approving without reading)
- Style-only feedback (missing architecture/security issues)
- Reviewing without running the code
- Personal preference over project conventions
- Nitpicking while missing major architectural issues
- Blocking on subjective style when functionality is correct

---

## Cross-References

- **Review workflow**: `workflows/review.md`
- **Quality Engineer skill**: `skills/quality-engineer/SKILL.md`
- **Security Architect skill**: `skills/security-architect/SKILL.md`
- **Testing rules**: `rules/testing.md`
- **Code style rules**: `rules/code-style.md`
- **Security rules**: `rules/security.md`
- **BLUF-6 format**: `specs/bluf-6.md`
