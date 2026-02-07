---
name: Mock Service Worker (MSW)
category: testing
last_updated: 2026-01-14
maturity: stable
---

# Mock Service Worker (MSW)

## Overview

API mocking library using Service Worker to intercept network requests in browser and Node.js. Realistic HTTP mocking for testing without modifying application code. Industry standard for API mocking in 2026.

## Key Metrics

- **Approach:** Service Worker interception (browser), Node.js server (tests)
- **DX:** Request handlers mirror real API, reusable mocks
- **Compatibility:** REST, GraphQL, browser + Node.js
- **Maturity:** 6+ years, production-ready
- **Cost:** Free, open-source

## Use Cases

| Scenario                             | Fit Score (1-10) | Rationale                             |
| ------------------------------------ | ---------------- | ------------------------------------- |
| Integration tests (components + API) | 10               | Mock API without changing app code    |
| Browser development (mock endpoints) | 10               | Develop frontend before backend ready |
| GraphQL API mocking                  | 9                | Native GraphQL support                |
| Storybook with API data              | 9                | MSW addon for component stories       |
| Simple unit tests (pure functions)   | 4                | No API calls = no mocking needed      |

## Trade-offs

### Strengths

- **Realistic:** Service Worker = real HTTP requests (vs `fetch` stub)
- **Reusable:** Same mocks for tests, Storybook, development
- **No Code Changes:** App code unchanged (vs dependency injection)
- **GraphQL Support:** Query/mutation mocking out of box

### Weaknesses

- **Browser Only (Service Worker):** Node.js requires separate server setup
- **Setup Complexity:** More config than simple `vi.mock()`
- **Debugging:** Service Worker layer can obscure issues
- **Overhead:** For simple unit tests, `vi.mock()` easier

## Implementation Pattern

```bash
npm install msw --save-dev
npx msw init public/ --save
```

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  // REST GET
  http.get("/api/users", () => {
    return HttpResponse.json([
      { id: 1, name: "Alice", email: "alice@example.com" },
      { id: 2, name: "Bob", email: "bob@example.com" },
    ]);
  }),

  // REST POST
  http.post("/api/users", async ({ request }) => {
    const newUser = await request.json();
    return HttpResponse.json({ id: 3, ...newUser }, { status: 201 });
  }),

  // GraphQL query
  graphql.query("GetUser", ({ variables }) => {
    return HttpResponse.json({
      data: {
        user: {
          id: variables.id,
          name: "Alice",
        },
      },
    });
  }),

  // Error response
  http.get("/api/error", () => {
    return HttpResponse.json({ message: "Server error" }, { status: 500 });
  }),
];

// src/mocks/browser.ts (for development)
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

// src/mocks/server.ts (for Node.js tests)
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

```typescript
// app/layout.tsx (development mode)
"use client";
import { useEffect } from "react";

if (process.env.NODE_ENV === "development") {
  useEffect(() => {
    import("@/mocks/browser").then(({ worker }) => {
      worker.start();
    });
  }, []);
}

// users.test.tsx (Vitest)
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it("fetches users successfully", async () => {
  render(<UserList />);

  // Wait for API call to complete
  await waitFor(() => {
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});

it("handles API error", async () => {
  // Override specific endpoint for this test
  server.use(
    http.get("/api/users", () => {
      return HttpResponse.json({ message: "Server error" }, { status: 500 });
    })
  );

  render(<UserList />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

## MSW vs Alternatives

| Aspect             | MSW          | vi.mock()           | Mirage.js                  |
| ------------------ | ------------ | ------------------- | -------------------------- |
| **Realism**        | High ✅ (SW) | Low (function stub) | High ✅ (in-memory server) |
| **Reusability**    | High ✅      | Test-specific       | High ✅                    |
| **Setup**          | Moderate     | Easy ✅             | Complex                    |
| **GraphQL**        | Built-in ✅  | Manual              | Manual                     |
| **Browser + Node** | Yes ✅       | Node only           | Both ✅                    |

## Alternatives

| Alternative                 | When to Choose Instead                              |
| --------------------------- | --------------------------------------------------- |
| **vi.mock() / jest.mock()** | Simple function mocking, unit tests, no HTTP needed |
| **Mirage.js**               | Need in-memory database, complex API states         |
| **Real API (staging)**      | E2E tests, integration environment available        |

## References

- [MSW Official Docs](https://mswjs.io/)
- [MSW with Storybook](https://storybook.js.org/addons/msw-storybook-addon)
- [MSW vs Alternatives](https://mswjs.io/docs/comparison)
