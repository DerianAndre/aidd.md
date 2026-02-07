---
description: 🔍 Architecture and security audit. Reviews technical debt and generates pre-merge checklists for branch, changes or staged changes
---

# Workflow: Review (Pre-Merge Audit)

> **Purpose:** Complete code review before merge, focused on architecture, security, and technical debt

## Invocation

| Type | Items |
|------|-------|
| **Skills** | code-review, receiving-code-review |
| **Specialized** | clean-ddd-hexagonal |
| **MCPs** | WebSearch |

---

## Review Scope

- **Branch review:** Complete changes from the feature branch vs main
- **Staged changes:** Only files in the Git staging area
- **Specific files:** Individual files specified

---

## Step 1: Identify Changes

**Indicator**: `[aidd.md] Workflow - review (Identify Changes)`

```bash
# View full diff
git diff main..feature-branch

# View only modified files
git diff main..feature-branch --name-only

# View staged changes
git diff --cached
```

---

## Step 2: Architectural Review

**Indicator**: `[aidd.md] Workflow - review (Architectural Review)`

### Hexagonal Architecture Compliance

**Verify:**

- [ ] Does Domain NOT import from infrastructure/presentation?
- [ ] Are interfaces used to abstract external dependencies?
- [ ] Do DTOs separate domain from API contracts?
- [ ] Are Repositories interfaces in domain, implemented in infra?

**Activate skill:** `system-architect`

**Prompt:**

```
Review the following code changes for hexagonal architecture compliance.
Check:
1. Domain has no infrastructure dependencies
2. Use cases/services don't depend on frameworks
3. Dependency Injection is properly used
4. Interfaces define boundaries

[PASTE GIT DIFF]
```

---

## Step 3: Security Review (OWASP)

**Indicator**: `[aidd.md] Workflow - review (Security Review)`

**Security Checklist:**

### A01: Broken Access Control

- [ ] Is ownership verified before allowing access?
- [ ] Are there authorization checks on sensitive endpoints?
- [ ] Are object IDs protected against IDOR?

**Vulnerable example:**

```typescript
// ❌ VULNERABLE
app.get("/orders/:id", async (req, res) => {
  const order = await db.order.findUnique({ where: { id: req.params.id } });
  return res.json(order); // Any user can see any order!
});
```

### A02: Cryptographic Failures

- [ ] Passwords hashed with bcrypt (cost ≥12)?
- [ ] Sensitive data NOT in logs?
- [ ] HTTPS forced in production?

### A03: Injection

- [ ] Queries use prepared statements?
- [ ] Input sanitized before use in SQL/Shell/HTML?
- [ ] ORMs configured correctly?

**Activate skill:** `security-architect`

```bash
# Scan secrets
npm run scan:secrets src/
```

---

## Step 4: Code Quality Review

**Indicator**: `[aidd.md] Workflow - review (Code Quality Review)`

### Cyclomatic Complexity

```bash
# Analyze complexity of modified functions
npx eslint src --rule 'complexity: ["error", 15]'
```

**If CC >15:** Refactor (Extract Method, Strategy Pattern)

### Naming Conventions

**Backend (TypeScript/NestJS):**

- Classes: `PascalCase` (e.g., `UserService`)
- Functions: `camelCase` (e.g., `getUserProfile`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `MAX_RETRIES`)
- Files: `kebab-case.ts` (e.g., `user-service.ts`)

**Frontend (React):**

- Components: `PascalCase` (e.g., `UserProfile.tsx`)
- Hooks: `use` prefix (e.g., `useAuth`)
- Props: `camelCase` interfaces (e.g., `ButtonProps`)

### DRY Violations

- [ ] Duplicate code >3 times? → Extract to function/utility
- [ ] Similar logic in multiple places? → Abstract to service

---

## Step 5: Testing Review

**Indicator**: `[aidd.md] Workflow - review (Testing Review)`

**Verify:**

- [ ] Do new functions have tests?
- [ ] Do tests follow AAA pattern?
- [ ] Edge cases covered?
- [ ] Are tests non-fragile (no test implementation details)?

```bash
# View coverage of modified files
git diff --name-only | grep "\.ts$" | xargs npm run test:coverage --
```

**Target:**

- New functions: 100% coverage
- Modified functions: no coverage reduction

---

## Step 6: Documentation Review

**Indicator**: `[aidd.md] Workflow - review (Documentation Review)`

**Checklist:**

- [ ] API changes reflected in OpenAPI spec?
- [ ] Do complex functions have JSDoc?
- [ ] README updated if setup/usage changes?
- [ ] ADR created for significant architectural decisions?

**If API changes:**

```bash
# Re-Generate OpenAPI spec
npm run generate:openapi

# Validate
npm run validate:openapi docs/api-spec.yaml
```

---

## Step 7: Blocking Criteria

**Indicator**: `[aidd.md] Workflow - review (Blocking Criteria)`

### ❌ BLOCKERS (NO MERGE)

1. **Critical security:**

   - Hardcoded secrets
   - SQL injection vulnerable
   - HIGH/CRITICAL vulnerabilities in `npm audit`

2. **Tests:**

   - Tests failing in CI
   - Coverage <60% on modified files

3. **Architecture:**

   - Domain importing from infrastructure
   - Violation of SOLID principles

4. **Quality:**
   - Lint errors (no warnings)
   - Cyclomatic complexity >20

### WARNINGS (Fix before merge)

-Complexity 15-20

- Duplicate code
- Missing JSDoc on public functions
- Performance concerns (N+1 queries)

---

## Step 8: Generate Pre-Merge Checklist

**Indicator**: `[aidd.md] Workflow - review (Pre-Merge Checklist)`

**Template:**

```markdown
## Pre-Merge Checklist

### ✅ Approved

- [x] Tests passing in CI
- [x] Coverage: 92% (target: ≥80%)
- [x] No critical vulnerabilities
- [x] Hexagonal architecture respected

### Warnings

- [ ] **Performance:** `UserService.findAll()` has N+1 query
  - **Action:** Use `include` in Prisma query
- [ ] **Complexity:** `OrderProcessor.calculate()` has CC: 18
  - **Action:** Refactor by extracting `calculateTaxes()`

### Blockers

None

### Architecture Comments

- Good: Use of Repository pattern for abstraction
- Consider: Add cache layer for frequent queries

### Next Step

- [ ] Fix N+1 query
- [ ] Refactor complex function
- [ ] Rerun tests
- [ ] **READY TO MERGE** (after fixes)
```

---

## Automation (GitHub PR Template)

```markdown
<!-- .github/pull_request_template.md -->

## Description

[Describe your changes]

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## ✅ Checklist

- [ ] Tests added for new functionality
- [ ] No security vulnerabilities (`npm run scan:secrets`)
- [ ] Architecture review passed
- [ ] Documentation updated
- [ ] Coverage ≥80% on changed files

## Security Review

- [ ] No hardcoded secrets
- [ ] Input validation implemented
- [ ] Authorization checks in place

## Performance Impact

- [ ] No N+1 queries introduced
- [ ] Bundle size impact: [+/-X KB]
```

---

## Skills Used

- `system-architect` - Architectural review
- `security-architect` - OWASP audit
- `quality-engineer` - coverage analysis
- `data-architect` - Query/schema review

---

## Template: Code Review

> Absorbed from `templates/code-review.md`

### Sub-Agent Roles

| Role                 | Focus                                          |
| -------------------- | ---------------------------------------------- |
| **Senior Reviewer**  | Architecture, design patterns, business logic  |
| **Security Auditor** | Vulnerability scanning, input validation, auth |

### Review Order (Priority)

1. **Architecture compliance** (most critical, hardest to fix later)
2. **Security** (vulnerabilities, input validation, auth)
3. **Performance** (N+1 queries, re-renders, bundle impact)
4. **Testing coverage** (new code has tests, edge cases)
5. **Code quality** (types, naming, conventions)
6. **Accessibility** (WCAG, keyboard, screen reader — if frontend)
7. **Documentation** (complex logic explained, APIs documented)

### Severity Levels

| Level          | Description                                                    | Action Required                     |
| -------------- | -------------------------------------------------------------- | ----------------------------------- |
| **Blocker**    | Security vulnerabilities, data loss risk, broken functionality | Must fix before merge               |
| **Critical**   | Architecture violations, missing tests for critical paths      | Should fix before merge             |
| **Major**      | Code quality issues, missing edge cases                        | Fix in this PR or tracked follow-up |
| **Minor**      | Naming, minor style improvements                               | Nice to have                        |
| **Suggestion** | Alternative approaches, future considerations                  | Optional                            |

### Consolidated Checklist

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

### Quality Gates

- [ ] All blockers resolved
- [ ] All critical items resolved or tracked
- [ ] Review summary provided in BLUF format
- [ ] Security quick check completed

### Anti-Patterns

- Rubber stamping (approving without reading)
- Style-only feedback (missing architecture/security issues)
- Reviewing without running the code
- Personal preference over project conventions
- Nitpicking while missing major architectural issues
- Blocking on subjective style when functionality is correct
