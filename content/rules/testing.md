# Testing Standards & Best Practices

> **Activation:** When writing tests, reviewing code, or analyzing coverage

---

## Coverage Philosophy

### Coverage is NOT a Goal, It's a Side Effect

- **Don't chase 100% blindly**—focus on **high-value, high-risk code**
- **Cyclomatic Complexity** is the true metric:
  - Complexity ≤3: Tests optional (simple getters/setters)
  - Complexity 4-7: Tests recommended
  - Complexity ≥8: Tests MANDATORY (refactor if >15)

### Calculate Cyclomatic Complexity

```bash
# TypeScriptLint complexity check
npx eslint . --plugin complexity --rule 'complexity: ["error", 8]'
```

---

## Test Pyramid

```
        /\
       /E2\      ← 10% End-to-End (Slow, brittle)
      /----\
     / Integ\    ← 20% Integration (Medium speed)
    /--------\
   /   Unit   \  ← 70% Unit Tests (Fast, isolated)
  /____________\
```

### Distribution Guidelines

- **Unit:** 70% - Test business logic in isolation
- **Integration:** 20% - Test module interactions (DB, API)
- **E2E:** 10% - Test critical user journeys

---

## AAA Pattern (Arrange-Act-Assert)

### Template

```typescript
describe("Feature: User Registration", () => {
  describe("UserService.register", () => {
    it("should hash password before storing", async () => {
      // 🔧 ARRANGE: Set up test data and mocks
      const mockRepo = {
        findByEmail: vi.fn().mockResolvedValue(null),
        save: vi.fn().mockResolvedValue({ id: "123" }),
      };
      const service = new UserService(mockRepo);
      const input = { email: "test@example.com", password: "Plain123!" };

      // ⚡ ACT: Execute the system under test
      const result = await service.register(input);

      // ✅ ASSERT: Verify the outcome
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: input.email,
          password: expect.not.stringContaining("Plain"), // Hashed
        })
      );
      expect(result.id).toBe("123");
    });
  });
});
```

---

## Test Doubles: Mocks vs Stubs vs Spies

### When to Use Which

| Type     | Purpose                   | Example                                    |
| -------- | ------------------------- | ------------------------------------------ |
| **Stub** | Provide canned responses  | `vi.fn().mockReturnValue(42)`              |
| **Mock** | Verify interactions       | `expect(mockFn).toHaveBeenCalledWith(...)` |
| **Spy**  | Observe real object       | `vi.spyOn(obj, 'method')`                  |
| **Fake** | Simplified implementation | In-memory database for tests               |

### Example: Testing Email Service

```typescript
// ❌ BAD: Real email service (slow, side effects)
it("sends welcome email", async () => {
  await emailService.send("user@test.com", "Welcome!");
  // How do we verify? Check real inbox?
});

// ✅ GOOD: Mock to verify behavior
it("sends welcome email", async () => {
  const mockEmailService = {
    send: vi.fn().mockResolvedValue(true),
  };

  await userService.register({ email: "user@test.com" }, mockEmailService);

  expect(mockEmailService.send).toHaveBeenCalledWith(
    "user@test.com",
    expect.stringContaining("Welcome")
  );
});
```

---

## Testing Business Logic (Domain Layer)

### Characteristics of Good Unit Tests

1. **Fast:** <100ms per test
2. **Isolated:** No database, no network, no filesystem
3. **Repeatable:** Same input = same output (no randomness, no dates)
4. **Self-validating:** Pass/fail, no manual inspection

### Example: Pure Function Testing

```typescript
// Domain function: Calculate discounted price
export function calculateDiscount(
  price: number,
  tierLevel: "bronze" | "silver" | "gold"
): number {
  const discounts = { bronze: 0.05, silver: 0.1, gold: 0.15 };
  return price * (1 - discounts[tierLevel]);
}

// Tests
describe("calculateDiscount", () => {
  it.each([
    [100, "bronze", 95],
    [100, "silver", 90],
    [100, "gold", 85],
    [0, "gold", 0], // Edge case: zero price
    [99.99, "bronze", 94.99], // Floating point handling
  ])("calculates %d with %s tier as %d", (price, tier, expected) => {
    expect(calculateDiscount(price, tier as any)).toBeCloseTo(expected);
  });
});
```

---

## Integration Testing

### Database Tests (Use Transactions for Isolation)

```typescript
import { PrismaClient } from "@prisma/client";

describe("UserRepository Integration Tests", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("saves and retrieves user", async () => {
    // Use transaction to auto-rollback
    await prisma.$transaction(async (tx) => {
      const repo = new UserRepository(tx);

      const user = await repo.create({ email: "test@example.com" });
      const found = await repo.findById(user.id);

      expect(found?.email).toBe("test@example.com");

      // Transaction auto-rolls back, database stays clean
    });
  });
});
```

### API Endpoint Tests (Supertest)

```typescript
import request from "supertest";
import { app } from "../app";

describe("POST /api/users", () => {
  it("creates user with valid data", async () => {
    const response = await request(app)
      .post("/api/users")
      .send({ email: "new@example.com", password: "Secure123!" })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      email: "new@example.com",
    });
    expect(response.body.password).toBeUndefined(); // Password not exposed
  });

  it("returns 400 for invalid email", async () => {
    await request(app)
      .post("/api/users")
      .send({ email: "not-an-email", password: "Secure123!" })
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toContain("email");
      });
  });
});
```

---

## E2E Testing (Playwright/Cypress)

### Critical User Journeys Only

```typescript
import { test, expect } from "@playwright/test";

test("User can complete checkout flow", async ({ page }) => {
  // GIVEN: User is on the shop page
  await page.goto("/shop");

  // WHEN: User adds item to cart and checks out
  await page.click('button :text("Add to Cart")');
  await page.click('a :text("Cart")');
  await page.click('button :text("Checkout")');

  // Fill in payment form
  await page.fill('input[name="cardNumber"]', "4242424242424242");
  await page.fill('input[name="expiry"]', "12/25");
  await page.fill('input[name="cvc"]', "123");

  await page.click('button :text("Pay Now")');

  // THEN: Order confirmation is shown
  await expect(page.locator("h1")).toContainText("Order Confirmed");
});
```

---

## What NOT to Test

### 1. Third-Party Library Internals

```typescript
// ❌ DON'T test React itself
it("useState works", () => {
  const [count, setCount] = useState(0);
  setCount(1);
  expect(count).toBe(1); // This is React's job to test
});

// ✅ DO test your component's behavior
it("increments counter when button is clicked", () => {
  render(<Counter />);
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByText(/count: 1/i)).toBeInTheDocument();
});
```

### 2. Trivial Code

```typescript
// ❌ DON'T test getters/setters
class User {
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}

it("returns full name", () => {
  const user = new User("John", "Doe");
  expect(user.fullName).toBe("John Doe"); // Waste of time
});
```

### 3. Framework Boilerplate

```typescript
// ❌ DON'T test auto-generated code
it("module exports UserService", () => {
  expect(UserService).toBeDefined(); // No value
});
```

---

## Coverage Reports

### Vitest Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "**/node_modules/**",
        "**/*.config.ts",
        "**/dist/**",
        "**/*.d.ts",
        "**/types/**",
        "**/*.spec.ts", // Don't measure test files
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

### Analyzing Coverage Gaps

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html

# Focus on:
# 1. Uncovered branches (if/else statements)
# 2. Error handling paths
# 3. Edge cases in complex functions
```

---

## Test Naming Conventions

### Pattern: `should [expected behavior] when [condition]`

```typescript
// ✅ GOOD: Descriptive, behavior-focused
it('should return 404 when user does not exist', () => { ... });
it('should cache result for 5 minutes after first call', () => { ... });
it('should throw ValidationError when email is invalid', () => { ... });

// ❌ BAD: Implementation-focused, vague
it('test getUserById', () => { ... });
it('works correctly', () => { ... });
it('should call repository', () => { ... }); // Too low-level
```

---

## Prioritization Matrix

| Code Type           | Complexity | Risk   | Test Priority |
| ------------------- | ---------- | ------ | ------------- |
| Payment logic       | High       | High   | **CRITICAL**  |
| Authentication      | High       | High   | **CRITICAL**  |
| Data transformation | Medium     | Medium | **HIGH**      |
| UI components       | Low        | Low    | **MEDIUM**    |
| Config parsers      | Medium     | Low    | **LOW**       |
| Simple DTOs         | Low        | Low    | **SKIP**      |

---

**Tool Integration:**

- Run tests on every commit (pre-commit hook)
- Block PRs with <80% coverage on changed files
- Use `/test` workflow for generating comprehensive test suites

---

## Template: Testing Strategy

> Absorbed from `templates/testing.md`

### Coverage Targets by Layer

| Layer | Target | Rationale |
|-------|--------|-----------|
| Domain | 100% | Business logic is non-negotiable |
| Application | 90% | Schemas, use cases |
| Infrastructure | 80% | Adapters, critical integrations |
| Presentation | 70% | Interaction paths, not visual details |

### Test Case Identification from Acceptance Criteria

Derive test cases systematically:

1. From acceptance criteria (Given/When/Then)
2. Happy path first
3. Edge cases: boundaries, nulls, empty, max values
4. Error cases: invalid input, failures, timeouts
5. Concurrent: race conditions, abort signals

### Mock Strategy

- Mock at PORT boundaries (not deep internals)
- Use `vi.fn()` for spies
- Use `vi.useFakeTimers()` for timing-dependent tests
- Reset ALL state in `beforeEach` (stores, mocks, timers)
- Contract tests: verify adapters satisfy port interfaces

### Contract Test Pattern

Verify adapters implement port contracts correctly:

```typescript
// FlowRepository.contract.ts
export function testFlowRepositoryContract(repo: FlowRepository) {
  it('should save and retrieve flow', async () => { ... });
  it('should delete flow', async () => { ... });
  // ... all port methods
}
```

### Abort Signal Testing Pattern

```typescript
it('should abort on signal', async () => {
  const controller = new AbortController();
  const promise = service.execute({ signal: controller.signal });
  controller.abort();
  await expect(promise).rejects.toThrow(ExecutionAbortedException);
});
```

### Store Testing Pattern (Zustand)

```typescript
beforeEach(() => {
  useFlowStore.setState(useFlowStore.getInitialState());
});
```

### Testing Quality Gates

- [ ] Coverage targets met per layer
- [ ] All acceptance criteria have corresponding tests
- [ ] No skipped/disabled tests
- [ ] Tests run independently (no order dependency)
- [ ] Mocks at port boundaries only
- [ ] State reset in `beforeEach`

### Testing Anti-Patterns (Template)

- Testing implementation details instead of behavior
- 100% coverage obsession on presentation layer
- Slow tests in unit suite (move to integration)
- Shared mutable state between tests
- Testing framework internals
- Disabling tests to make CI pass
- Testing private methods directly

**Last Updated:** 2026-02-06
