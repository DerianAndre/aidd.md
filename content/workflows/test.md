---
description: 🧪 Generates Vitest/TS tests with 100% coverage. Uses cyclomatic analysis, AAA pattern and isolation for critical logic and edge cases
---

# Workflow: Test (Complete Test Generation)

> **Purpose:** Generate complete test suites with Vitest, React Testing Library, and 100% coverage in critical logic

## Invocation

| Type | Items |
|------|-------|
| **Skills** | test-driven-development, verification |
| **MCPs** | Context7 |

---

## Prerequisites

- [ ] Vitest configured (`vitest.config.ts`)
- [ ] React Testing Library installed (for UI components)
- [ ] Code to test identified

---

## Testing Strategy

### Prioritization by Cyclomatic Complexity

```bash
# Analyze complexity (requires ESLint complexity rule)
npx eslint src --rule 'complexity: ["error", 8]' --format json > complexity-report.json
```

**Priorities:**

1. **CC ≥15:** MANDATORY - High complexity, high risk
2. **CC 8-14:** RECOMMENDED - Important business logic
3. **CC ≤7:** OPTIONAL - Simple code, low risk

---

## Step 1: Analysis of Code

**Indicator**: `[aidd.md] Workflow - test (Analysis of Code)`

**Identify:**

- ✅ Pure functions (business logic)
- ✅ React components with state/effects
- ✅ API endpoints (integration tests)
- ✅ Edge cases and boundary conditions

**Example analysis:**

```typescript
// src/domain/discount.ts
export function calculateDiscount(price: number, tier: string): number {
  // CC: 4 (3 conditions + 1 function)
  if (tier === "gold") return price * 0.85;
  if (tier === "silver") return price * 0.9;
  if (tier === "bronze") return price * 0.95;
  return price;
}
```

**Cases to test:**

- Happy path: Each valid tier
- Edge cases: price = 0, negative price
- Invalid input: invalid tier, undefined tier

---

## Step 2: Generate Unit Tests (AAA Pattern)

**Indicator**: `[aidd.md] Workflow - test (Generate Unit Tests)`

**Activate skill:** `quality-engineer`

**Prompt:**

```
Generate comprehensive Vitest unit tests for the following function.
Use AAA pattern (Arrange-Act-Assert).
Include:
- Happy path for all branches
- Edge cases (zero, negative, boundary values)
- Invalid inputs (null, undefined, wrong types)
- Use it.each for data-driven tests

[PASTE CODE]
```

**Expected output:**

```typescript
import { describe, it, expect } from "vitest";
import { calculateDiscount } from "./discount";

describe("calculateDiscount", () => {
  describe("Happy Path", () => {
    it.each([
      [100, "gold", 85],
      [100, "silver", 90],
      [100, "bronze", 95],
      [200, "gold", 170],
    ])("calculates %d with %s tier as %d", (price, tier, expected) => {
      expect(calculateDiscount(price, tier)).toBe(expected);
    });
  });

  describe("Edge Cases", () => {
    it("returns original price for unknown tier", () => {
      expect(calculateDiscount(100, "platinum")).toBe(100);
    });

    it("handles zero price", () => {
      expect(calculateDiscount(0, "gold")).toBe(0);
    });

    it("handles decimal prices", () => {
      expect(calculateDiscount(99.99, "silver")).toBeCloseTo(89.99);
    });
  });

  describe("Invalid Inputs", () => {
    it("throws for negative price", () => {
      expect(() => calculateDiscount(-100, "gold")).toThrow();
    });
  });
});
```

---

## Step 3: Generate Component Tests (React)

**Indicator**: `[aidd.md] Workflow - test (Generate Component Tests)`

**For UI components, use:**

- `screen.getByRole()` (priority #1)
- `fireEvent` or `userEvent` for interactions
- `waitFor` for async operations

**Prompt:**

```
Generate React component tests using Vitest + Testing Library.
Test:
- Rendering (snapshot optional)
- User interactions (click, type, submit)
- Conditional rendering
- Accessibility (ARIA attributes)

Component to test:
[PASTE COMPONENT CODE]
```

---

## Step 4: Verify Coverage

**Indicator**: `[aidd.md] Workflow - test (Verify Coverage)`

```bash
# Run tests with coverage
npm run test:coverage

# View HTML report
open coverage/index.html
```

**Analyze:**

- **Statements:** All lines covered?
- **Branches:** All if/else tested?
- **Functions:** All functions called?

**If coverage < target:**

1. Identify uncovered lines (view HTML report)
2. Add tests for those cases
3. Rerun `npm run test:coverage`

---

## Step 5: Test Quality Review

**Indicator**: `[aidd.md] Workflow - test (Test Quality Review)`

### Checklist

- [ ] **AAA Pattern:** Arrange-Act-Assert clearly separated
- [ ] **Descriptive names:** `it('should X when Y')`
- [ ] **Isolated:** Each test independent (no order)
- [ ] **Fast:** Unit tests <100ms each
- [ ] **No test implementation details:** Test behavior, not internals
- [ ] **No hardcoded values:** Use descriptive variables

### Anti-Patterns to Avoid

❌ **Testing implementation details:**

```typescript
// BAD: Testing private method
expect(component.state.count).toBe(1);

// GOOD: Testing observable behavior
expect(screen.getByText("Count: 1")).toBeInTheDocument();
```

❌ **Tests that never fail:**

```typescript
// BAD: Always passes
it("should work", () => {
  const result = add(2, 2);
  expect(result).toBeDefined(); // Too weak
});

// GOOD: Specific assertion
it("should add two numbers correctly", () => {
  expect(add(2, 2)).toBe(4);
});
```

---

## Step 6: Integration Tests (Optional)

**Indicator**: `[aidd.md] Workflow - test (Integration Tests)`

**For:**

- API endpoints
- Database queries
- External service calls

**Example (API test):**

```typescript
import request from "supertest";
import { app } from "../app";

describe("POST /api/users", () => {
  it("creates user and returns 201", async () => {
    const response = await request(app)
      .post("/api/users")
      .send({ email: "test@example.com", password: "Secure123!" })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      email: "test@example.com",
    });
  });
});
```

---

## Coverage Objectives

### By Layer

| Layer                    | Objective | Justification           |
| ------------------------ | --------- | ----------------------- |
| **Domain Logic**         | 100%      | Critical business logic |
| **Application Services** | ≥90%      | Important orchestration |
| **Controllers**          | ≥70%      | Validation focus        |
| **Infrastructure**       | ≥60%      | External mocks          |

### Exceptions

**DO NOT test:**

- DTOs/Interfaces (types only)
- Trivial getters/setters
- Framework boilerplate
- Generated code

---

## Automation (CI)

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:coverage

      - name: Enforce coverage thresholds
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.statements.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80%"
            exit 1
          fi
```

---

## Skills & References

- **Skill:** `quality-engineer` - For Test generation
- **Testing Library:** [https://testing-library.com/](https://testing-library.com/)
- **Vitest:** [https://vitest.dev/](https://vitest.dev/)
