---
name: React Testing Library
category: testing
last_updated: 2026-01-14
maturity: stable
---

# React Testing Library

## Overview

User-centric React component testing focused on how components are used, not implementation details. Industry standard for React testing in 2026. Part of Testing Library family (Vue, Svelte, Angular).

## Key Metrics

- **Philosophy:** Test behavior, not implementation (no shallow rendering)
- **DX:** Simple API, accessibility queries, Vitest/Jest integration
- **Adoption:** Industry standard (recommended by React docs)
- **Maturity:** 8+ years, production-grade
- **Cost:** Free, open-source

## Use Cases

| Scenario                    | Fit Score (1-10) | Rationale                                            |
| --------------------------- | ---------------- | ---------------------------------------------------- |
| React component testing     | 10               | Industry standard, React docs recommendation         |
| Accessibility-focused tests | 10               | Queries by role, label, text (mirrors user behavior) |
| Integration tests           | 9                | Test components with children, hooks, context        |
| Unit tests (pure functions) | 8                | Works, but Vitest alone simpler for pure logic       |
| E2E tests                   | 5                | Use Playwright/Cypress (RTL for component-level)     |

## Trade-offs

### Strengths

- **User-Centric:** Query by role/label/text (how users interact)
- **Accessibility:** Encourages semantic HTML, ARIA attributes
- **No Implementation Details:** Tests don't break on refactors (vs Enzyme shallow)
- **Real DOM:** Renders to jsdom (realistic vs shallow rendering)

### Weaknesses

- **Learning Curve:** Different from Enzyme (no shallow rendering)
- **Async Complexity:** `waitFor`, `findBy` queries can be confusing
- **Not E2E:** For full app testing, use Playwright/Cypress
- **Verbose:** More setup than Enzyme shallow rendering

## Implementation Pattern

```bash
npm install @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

```typescript
// Button.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders button with text", () => {
    render(<Button>Click me</Button>);

    // Query by role (accessibility-first)
    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disables button when disabled prop is true", () => {
    render(<Button disabled>Click me</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });
});

// LoginForm.test.tsx (integration test)
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";

it("submits form with email and password", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();

  render(<LoginForm onSubmit={onSubmit} />);

  // Fill form
  await user.type(screen.getByLabelText("Email"), "test@example.com");
  await user.type(screen.getByLabelText("Password"), "password123");

  // Submit
  await user.click(screen.getByRole("button", { name: "Login" }));

  // Assert
  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
  });
});
```

## React Testing Library vs Alternatives

| Aspect          | RTL              | Enzyme            | Playwright Component |
| --------------- | ---------------- | ----------------- | -------------------- |
| **Philosophy**  | User-centric ✅  | Implementation    | E2E                  |
| **Queries**     | Accessibility ✅ | CSS/props         | Locators             |
| **DOM**         | Real (jsdom) ✅  | Shallow/Full      | Real browser ✅      |
| **Maintenance** | Active ✅        | Deprecated        | Active ✅            |
| **Speed**       | Fast ✅          | Fastest (shallow) | Slower (browser)     |

## Alternatives

| Alternative                      | When to Choose Instead                           |
| -------------------------------- | ------------------------------------------------ |
| **Playwright Component Testing** | Need real browser, visual testing, cross-browser |
| **Vitest (alone)**               | Pure function tests, no DOM needed               |
| **Cypress Component Testing**    | Prefer Cypress DX, visual debugging              |

## References

- [React Testing Library Docs](https://testing-library.com/react)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [React Docs on Testing](https://react.dev/learn/testing)
